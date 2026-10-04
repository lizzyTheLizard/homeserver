# Design

## Context

The application image is built by the `build-app` job in `.github/workflows/homeserver.yml` from
`web/Dockerfile` with `context: .` and `file: web/Dockerfile`. Today that job uses a single
`cache-from: type=gha` and `cache-to: type=gha,mode=max`, and the Dockerfile stages the full
`node_modules` tree from the `deps` stage into both the `builder` and `runner` stages. Measured on
run `37201920427` (job 3m55s), the `cache-to` export alone is ~110s (54.9s preparing + 55.4s
sending) and the image layer export is ~25s — both dominated by `node_modules`. See proposal.md
for motivation. `web` is Next 16.3.6 with `reactCompiler: true`, built via plain `next build` (no
`--turbopack` flag), with no `output` configured.

## Goals / Non-Goals

**Goals:**
- Make a cache-hit build skip dependency install, `next build`, and full cache/image re-export.
- Shrink the time spent exporting cache and image layers.
- Shorten `next build` itself.
- Slim the assistant runtime image to production dependencies only.
- Keep the produced images runnable and contract-compatible with the smoke suite and deploy.

**Non-Goals:**
- Changing the smoke suite or deploy job logic.
- Introducing new runtime dependencies or altering the application's runtime behavior.

## Decisions

### 1. `mode=min` GHA cache

**Decision**: Replace `cache-to: type=gha,mode=max` with `cache-to: type=gha,mode=min` in the
`build-app`, `build-assistant`, and `build-whatsapp` jobs, leaving `cache-from: type=gha` unchanged.

**Rationale**: `mode=max` exports every intermediate layer of every stage (the measured 110s);
`mode=min` exports only the final layer of each stage, and BuildKit already keys each Dockerfile
stage's cache independently within the single GHA scope, so an unchanged `deps` stage still hits
cache without re-installing. Separate `scope=` namespaces were considered but rejected: at the
action level they would re-export the whole build into each namespace rather than isolate stages.

**Alternatives considered**:
- Per-stage `scope=deps/builder/runner` — requires three targeted `docker build --target` invocations to actually isolate stage caches; more moving parts for no measured extra win beyond `mode=min`. Rejected.
- Keep `mode=max` — still exports intermediate layers, so the cache export stays ~110s.
- Drop `cache-to` entirely (image-only build) — eliminates the export but loses cross-run caching, so every push re-installs and re-builds; rejected.

### 2. Turbopack for `next build`

**Decision**: Switch `web/package.json` `build` to `next build --turbopack` (or the equivalent
`next build` with Turbopack enabled as the default builder in Next 16).

**Rationale**: Next 16's Turbopack is stable and typically faster than webpack for `next build`; the
project already runs on 16.3.6 and has `reactCompiler: true`, both compatible with Turbopack build.

**Alternatives considered**:
- Leave webpack and rely only on caching — simpler but leaves the in-build 26s untouched; the issue explicitly asks for faster `next build`.
- Native TypeScript/`@typescript/native` — already partially in use; not a build-bundler change and not sufficient alone.

### 3. `output: "standalone"`

**Decision**: Add `output: "standalone"` to `web/next.config.ts` and change the `runner` stage to
copy `web/.next/standalone/**` (plus `web/public` and `web/.next/static`) instead of the full
`node_modules` and `web/.next`.

**Rationale**: The standalone output carries only the runtime `node_modules` required to run the
server, dramatically shrinking the layers copied into the runner image — which in turn shrinks both
the image layer export (~25s) and the cache export (~110s).

**Alternatives considered**:
- `pnpm --filter @homeserver/web deploy` / `--prod` prune — also reduces `node_modules` but leaves the general `.next` layout; standalone is the Next-idiomatic approach and pairs cleanly with the existing `CMD ["node", ...]` entrypoint pattern.
- Keep `output: "standalone"` off and only prune — less layer reduction; rejected.

### 4. Slim assistant runner with `prod-deps`

**Decision**: Add a `prod-deps` stage to `assistant/Dockerfile` that runs
`pnpm i --frozen-lockfile --prod --filter @homeserver/assistant`, and change the `runner` stage to
copy `node_modules` from `prod-deps` instead of the full dev tree from `builder`.

**Rationale**: The assistant runner currently copies the entire dev `node_modules` (including all
`devDependencies` and tooling). A `--prod` install mirrors the existing whatsapp-bridge image's
`prod-deps` stage, shrinking the runtime layer. The assistant's native-optional deps (`pg`, `ws`)
have pure-JS fallbacks, so `pnpm i --prod` completes without a native build step.

**Alternatives considered**:
- Leave the assistant runner as-is — keeps dev `node_modules` in the runtime image (the current bloat); rejected since the same layer-export win the web image got applies here.
- Move to a Next-style standalone output — not applicable: the assistant is a plain `tsc` build, not Next.js.

### 5. Cache the smoke stack's images

**Decision**: In the `integration-smoke` job, cache third-party image pulls with `actions/cache`
on `docker save` tarballs (load before `up`, save after). The `dev-machine` image is built in its
own `build-dev-machine` job (see decision 6) and loaded from artifact. The lighter `backup` and
`mock-oidc-server` images build inline during `docker compose up` (their `build:` sections stay in
compose); only `dev-machine` is a pre-built artifact.

**Rationale**: The smoke job's ~3m19s `up -d --wait` is dominated by re-pulling third-party images
(nginx, postgres×2, pgweb, dozzle, caddy, bind9, certbot) and rebuilding the heavy `dev-machine`
image's apt/bootstrap layers on every cold runner. Caching the pulls and moving the heavy image to
its own artifact build removes that repeated work — the 9 smoke tests themselves already run in
~35s. The `backup`/`mock-oidc-server` builds are small (a base image + a package install), so
building them inline during `up` is cheaper than the overhead of separate artifact jobs.

**Alternatives considered**:
- Pre-build `backup`/`mock-oidc-server` via `build-push-action` + `up --no-build` — tried, but their builds are too small to justify the extra artifact round-trip, so this was reverted to inline compose builds.
- Inline compose `build.cache_from`/`cache_to: type=gha` — tried first, but `docker compose up` does not wire the GHA cache backend into its inline build (the layers were rebuilt from scratch with no `importing/exporting cache` lines), so this was rejected in favor of explicit `build-push-action`.
- Trim which services the smoke stack starts (option 2) — deferred; the tests only exercise a subset, but removing services risks weakening coverage and is a separate scope decision.
- Cache via buildx `mode=max` for the third-party pulls — buildx gha cache only covers `build`, not `image:` pulls, so the `docker save`/`load` cache is still needed for third-party images.

### 6. Move dev-machine into its own image build

**Decision**: Move `infrastructure/dev/` to a top-level `dev-machine/` (mirroring `whatsapp-bridge/`),
give its Dockerfile repo-root-relative `COPY` paths, remove the compose `build:` section (image-only +
`pull_policy: never`), and build it in a dedicated `build-dev-machine` CI job that exports
`homeserver-dev-machine:latest` as an artifact. The artifact is loaded in both `integration-smoke`
and `deploy`, replacing the inline dev-machine build.

**Rationale**: The `dev-machine` image is the heaviest in the stack (apt bootstrap + code-server +
OpenCode + Playwright deps + wacli) and was being rebuilt inline in the smoke job. Building it once
as a first-class artifact (like the app/assistant/whatsapp-bridge images) lets both the smoke job
and the production deploy reuse the same image, and keeps its gha layer cache in its own scope.

**Alternatives considered**:
- Keep `dev-machine` under `infrastructure/dev` and build inline — rejected: it rebuilds on every smoke run and diverges from the artifact pattern the other three images already follow.
- Keep a compose `build:` section pointing at `../dev-machine` — rejected: the deploy's `docker compose up --build` would rebuild it on the server, defeating the shared artifact.

## Risks / Trade-offs

- **`mode=min` lowers cache-hit rate for non-final layers** → Mitigation: separate scopes isolate the `deps` stage (the expensive install) so it still hits cache on source-only changes; rebuilds re-populate the cache on later pushes.
- **Standalone output changes the runner layout and `CMD`** → Mitigation: update the Dockerfile `CMD`/`WORKDIR` to match Next's standalone server entrypoint, and rely on the existing smoke suite to prove the image still serves traffic before deploy.
- **Turbopack behavior differences** → Mitigation: the smoke suite and storybook/unit/integration tests run in CI and will catch regressions; if a specific Turbopack incompatibility surfaces, scope the build change to a follow-up.
- **Assistant `--prod` install could omit a runtime dependency** → Mitigation: the `--prod` set is the same one the whatsapp-bridge image already uses successfully, and the smoke suite boots the assistant container, which exercises its runtime requires.
- **Smoke-stack cache invalidation** → Mitigation: the third-party image cache key is tied to the compose files, and the buildx `type=gha` layer cache self-invalidates on layer changes, so a changed image or build input forces a fresh pull/build.
- **dev-machine image drift from source** → Mitigation: the `build-dev-machine` job runs on every push (like the other three images) and is a gate via `all-build-checks`, so the loaded image always matches the branch's `dev-machine/` source.
- **First build after switch is not faster** → Mitigation: the benefit is for subsequent cache-hit builds; the change is still correct because the acceptance criteria target the steady-state cache-hit path.

## Migration Plan

1. Land the workflow cache-scope + Dockerfile/standalone + Turbopack changes on the feature branch.
2. CI runs the full pipeline (lint/test/build/smoke) on the branch; confirm the build job is faster on a second consecutive push (cache hit) and the smoke suite still passes.
3. On merge, the deploy job loads the new standalone-based image; monitor the first deploy for a healthy stack.
4. Rollback: revert the branch/PR; the single aggregated `all-build-checks` gate means a broken image cannot deploy.
