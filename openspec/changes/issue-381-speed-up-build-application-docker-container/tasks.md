# Tasks

## 1. Scoped CI cache

- [ ] 1.1 Replace the single `cache-from: type=gha` / `cache-to: type=gha,mode=max` in the `build-app` job of `.github/workflows/homeserver.yml` with per-stage scopes `deps`, `builder`, `runner` (`cache-from: type=gha,scope=<s>` and `cache-to: type=gha,mode=min,scope=<s>`), and verify the workflow YAML parses and the `build-app` job still runs in CI.
- [ ] 1.2 Verify a second consecutive push (cache hit) to the branch shows the `build-app` job's cache export is no longer the largest line item and dependency install is reused from cache.

## 2. Standalone image output

- [ ] 2.1 Add `output: "standalone"` to `web/next.config.ts` and verify `pnpm --filter @homeserver/web build` emits `web/.next/standalone/` with a runnable server entrypoint.
- [ ] 2.2 Rewrite the `runner` stage of `web/Dockerfile` to copy the standalone output (plus `web/public` and `web/.next/static`) instead of the full `node_modules` and `web/.next`, updating `WORKDIR`/`CMD` to the standalone server, and verify a local `docker build` produces a valid image.
- [ ] 2.3 Verify the standalone-based `homeserver:latest` image loads and serves traffic in the CI smoke suite (integration-smoke job) without changes to the smoke or deploy jobs.

## 3. Turbopack build

- [ ] 3.1 Switch the `web` build to Turbopack in `web/package.json` and verify `pnpm --filter @homeserver/web build` completes successfully and the produced `.next` output passes the web unit/integration/storybook test jobs in CI.
- [ ] 3.2 Verify the Turbopack build produces a deployable image: the full `build-app` → `integration-smoke` → `deploy` path succeeds in CI on the branch.
