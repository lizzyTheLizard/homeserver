## Why

A developer working in the dev-machine currently has no way to create or edit the repo's `design/` artifacts from the browser: OpenDesign must be installed and built by hand on a workstation, which the project deliberately avoids ("edit them with OpenDesign" is unusable today). Adding OpenDesign to the dev stack — running inside the dev-machine like code-server/dsh/storybook, reachable at `https://dev.gutschi.site:8446` behind the same dev basic auth — removes that friction so design artifacts are authored directly in the repo from the browser.

## What Changes

- **OpenDesign is installed as part of the dev-machine image.** The dev Dockerfile gains a dedicated `node:24-bookworm` builder stage that fetches the pinned upstream source (`nexu-io/open-design`, tag `open-design-v0.22.1` — verified current latest release) and builds it there, mirroring the upstream `deploy/Dockerfile` recipe (`pnpm install --frozen-lockfile`, `@open-design/daemon` + `@open-design/web` builds, prod deploy prune, assembled into `/out`); the runtime stage only copies that compiled tree (`COPY --from=open-design-builder /out /opt/open-design`), so no sources, toolchain or package store ship in the image. Install root is `/opt/open-design` (outside the `dev_home` volume) with a `/usr/local/bin/od` entry; nothing is provisioned ad-hoc per container.
- **The dev stack starts OpenDesign automatically and keeps it running.** A `[program:opendesign]` supervisord entry (`command=od --no-open`, autostart + autorestart) runs the daemon on `OD_PORT=7456` and restarts it if it exits. The daemon env is exported by `infrastructure/dev/entrypoint.sh` before supervisord starts.
- **OpenDesign is reachable at `https://dev.gutschi.site:8446` with TLS and dev basic auth.** nginx publishes port `8446` and gets a TLS server block (existing `dev.gutschi.site` certs) proxying to `caddy:8446`; caddy applies the DEV basic auth (`DEV_USERNAME`/`DEV_PASSWORD_HASH`) and reverse-proxies to `dev-machine:7456`. Daemon env: `OD_BIND_HOST=0.0.0.0`, `OD_PORT=7456`, `OD_DATA_DIR=/home/dev/.od`, `OD_DISABLE_API_AUTH=1` (caddy is the authenticator, per upstream docker deployment docs), `OD_ALLOWED_ORIGINS=https://dev.gutschi.site:8446`.
- **The integration smoke suite verifies OpenDesign end to end.** The CI compose override bind-mounts the checked-out `design/` folder into the dev-machine at `/home/dev/workspace/design` (CI boots with `SKIP_GITHUB_BOOTSTRAP=1`, so there is no clone), and the suite checks `https://dev.gutschi.site:8446` through nginx + caddy: HTTP 200 with valid dev credentials, 401 without.
- **Out of scope:** importing `design/` as an OpenDesign project and wiring the DeepSeek Harness agent runtime are manual, one-time actions in the OpenDesign UI — no boot-time automation, no new credentials.
- **Docs updated** (`infrastructure/README.md`, root `README.md`) for the new port and daemon setup.

## Capabilities

### New Capabilities
- `dev-tools/open-design`: OpenDesign runs inside the dev-machine as part of the dev stack, installed from the pinned upstream build in the dev image, started and kept alive automatically, and reachable at `https://dev.gutschi.site:8446` over TLS behind the dev basic auth. Opening the repo's `design/` folder as a project and picking an agent runtime stay manual UI actions.

### Modified Capabilities
- `testing/stack-smoke-suite`: the stack smoke suite additionally verifies OpenDesign end to end through nginx and caddy — HTTP 200 with valid dev credentials and 401 without. (Base spec note: `openspec/specs/` has no main specs yet; this capability currently exists only as the delta of the in-flight change `integration-smoke-tests`, and this change extends it with the OpenDesign checks.)

## Impact

- `infrastructure/dev/Dockerfile` — `open-design-builder` stage (fetch + build + assemble `/out`) and runtime-stage `COPY --from=open-design-builder /out /opt/open-design` with the `/usr/local/bin/od` entry; `poppler-utils` runtime dep.
- `infrastructure/dev/supervisord.conf` — `[program:opendesign]` running `od --no-open` (autostart, autorestart, logs).
- `infrastructure/dev/entrypoint.sh` — exports the `OD_*` daemon env before `exec supervisord`.
- `infrastructure/docker-compose.yml` — nginx host port `8446:8446`.
- `infrastructure/nginx/nginx.conf` — TLS server block on `8446` proxying to `caddy:8446`.
- `infrastructure/caddy/Caddyfile` — `:8446` block with DEV basic auth proxying to `dev-machine:7456`.
- `infrastructure/README.md` / root `README.md` — new port and OpenDesign setup documentation (`infrastructure/env.example` is unchanged: the `OD_*` keys are not `.env` keys).
- `integration-test/` package — `docker-compose.ci.yml` override (bind-mount `design/` into dev-machine), `stack.ts`/`infra.tests.ts` OpenDesign checks (`env.test` already carries `DEV_USERNAME`/`DEV_PASSWORD`).
- No production routing/auth changes; no changes to how the existing dev tools (8443–8445) are routed or authenticated; no new secrets in `infrastructure/.env`.
