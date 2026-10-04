# Tasks

## 1. Scoped CI cache

- [x] 1.1 Change the `build-app`, `build-assistant`, and `build-whatsapp` jobs in `.github/workflows/homeserver.yml` from `cache-to: type=gha,mode=max` to `cache-to: type=gha,mode=min` (leaving `cache-from: type=gha`), and verify the workflow YAML parses and the jobs still run in CI.
- [x] 1.2 Verify a second consecutive push (cache hit) to the branch shows the `build-app` job's cache export is no longer the largest line item and dependency install is reused from cache.

## 2. Standalone image output

- [x] 2.1 Add `output: "standalone"` to `web/next.config.ts` and verify `pnpm --filter @homeserver/web build` emits `web/.next/standalone/` with a runnable server entrypoint.
- [x] 2.2 Rewrite the `runner` stage of `web/Dockerfile` to copy the standalone output (plus `web/public` and `web/.next/static`) instead of the full `node_modules` and `web/.next`, updating `WORKDIR`/`CMD` to the standalone server, and verify a local `docker build` produces a valid image.
- [x] 2.3 Verify the standalone-based `homeserver:latest` image loads and serves traffic in the CI smoke suite (integration-smoke job) without changes to the smoke or deploy jobs.

## 3. Slim assistant image

- [x] 3.1 Add a `prod-deps` stage to `assistant/Dockerfile` (mirroring the whatsapp-bridge image) and point the `runner` stage's `node_modules` copies at it instead of the full dev `node_modules`, and verify the image build succeeds in CI.
- [x] 3.2 Verify the slimmed `homeserver-assistant:latest` image still boots and serves traffic in the CI smoke suite without changes to the smoke or deploy jobs.

## 4. Turbopack build

- [ ] 4.1 Switch the `web` build to Turbopack in `web/package.json` and verify `pnpm --filter @homeserver/web build` completes successfully and the produced `.next` output passes the web unit/integration/storybook test jobs in CI.
- [ ] 4.2 Verify the Turbopack build produces a deployable image: the full `build-app` → `integration-smoke` → `deploy` path succeeds in CI on the branch.

## 5. Speed up the integration smoke stack

- [x] 5.1 Cache the third-party Docker image pulls in the `integration-smoke` job (`actions/cache` on `docker save` tarballs, loaded before `up`, saved after) so cold runners skip re-downloading nginx/postgres/pgweb/dozzle/caddy/bind9/certbot and the base images.
- [x] 5.2 Build `dev-machine` explicitly with `docker/build-push-action` (`cache-from`/`cache-to: type=gha`, `load: true`) and load it from the artifact, while `backup` and `mock-oidc-server` build inline during `docker compose up`, so the heavy image's apt/bootstrap layers are restored from the GHA cache instead of rebuilt.
- [x] 5.3 Verify the smoke suite still passes (9/9) and the `Start smoke stack` step is faster on a second consecutive push with warmed caches.

## 6. Move dev-machine into its own image build

- [x] 6.1 Move `infrastructure/dev/` to a top-level `dev-machine/` folder (like `whatsapp-bridge`), prefix its Dockerfile `COPY` paths (`dev-machine/supervisord.conf`, `dev-machine/entrypoint.sh`), and remove the `build:` section from the `dev-machine` compose service (image-only + `pull_policy: never`).
- [x] 6.2 Add a `build-dev-machine` CI job that builds `dev-machine/Dockerfile` (context `.`) into `homeserver-dev-machine:latest`, exports a `.tar`, and uploads it as an artifact, mirroring `build-whatsapp`.
- [x] 6.3 Wire the artifact into `integration-smoke` (download + `docker load`, drop the inline dev-machine build) and the `deploy` job (download + rsync + `docker load`), and add `build-dev-machine` to `all-build-checks` needs.
- [x] 6.4 Update docs (`AGENTS.md`, `infrastructure/README.md`) for the new `dev-machine/` location and image-based deploy, and verify the full CI pipeline (build → smoke → deploy) is green.
