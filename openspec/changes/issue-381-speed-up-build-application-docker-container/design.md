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
- Keep the produced image runnable and contract-compatible with the smoke suite and deploy.

**Non-Goals:**
- Changing the `whatsapp-bridge` or `assistant` builds.
- Changing the smoke suite or deploy job logic.
- Introducing new runtime dependencies or altering the application's runtime behavior.

## Decisions

### 1. Scoped GHA cache with `mode=min`

**Decision**: Replace the single `cache-from: type=gha` / `cache-to: type=gha,mode=max` with three
per-stage cache scopes — `deps`, `builder`, `runner` — each with `cache-from: type=gha,scope=<s>`
and `cache-to: type=gha,mode=min,scope=<s>`.

**Rationale**: `mode=max` exports every intermediate layer of every stage (the measured 110s);
`mode=min` exports only the final layer of each stage, and separate scopes let an unchanged `deps`
stage hit cache independently of `builder`/`runner` without one giant cache entry invalidating the
others.

**Alternatives considered**:
- Keep `mode=max` but add scopes — still exports intermediate layers, so the cache export stays large.
- Drop `cache-to` entirely (image-only build) — eliminates the 110s export but loses cross-run caching, so every push re-installs and re-builds; rejected.

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

## Risks / Trade-offs

- **`mode=min` lowers cache-hit rate for non-final layers** → Mitigation: separate scopes isolate the `deps` stage (the expensive install) so it still hits cache on source-only changes; rebuilds re-populate the cache on later pushes.
- **Standalone output changes the runner layout and `CMD`** → Mitigation: update the Dockerfile `CMD`/`WORKDIR` to match Next's standalone server entrypoint, and rely on the existing smoke suite to prove the image still serves traffic before deploy.
- **Turbopack behavior differences** → Mitigation: the smoke suite and storybook/unit/integration tests run in CI and will catch regressions; if a specific Turbopack incompatibility surfaces, scope the build change to a follow-up.
- **First build after switch is not faster** → Mitigation: the benefit is for subsequent cache-hit builds; the change is still correct because the acceptance criteria target the steady-state cache-hit path.

## Migration Plan

1. Land the workflow cache-scope + Dockerfile/standalone + Turbopack changes on the feature branch.
2. CI runs the full pipeline (lint/test/build/smoke) on the branch; confirm the build job is faster on a second consecutive push (cache hit) and the smoke suite still passes.
3. On merge, the deploy job loads the new standalone-based image; monitor the first deploy for a healthy stack.
4. Rollback: revert the branch/PR; the single aggregated `all-build-checks` gate means a broken image cannot deploy.
