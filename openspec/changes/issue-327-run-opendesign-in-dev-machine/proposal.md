## Why

A developer working in the dev-machine currently has no way to create or edit the repo's `design/` artifacts from the browser: OpenDesign must be installed and built by hand on a workstation, which the project deliberately avoids ("edit them with OpenDesign" is unusable today). Adding OpenDesign to the dev stack — running inside the dev-machine like code-server/dsh/storybook, reachable at `https://dev.gutschi.site:8446` behind the same dev basic auth, and already opened on the repo's `design/` folder — removes that friction so design artifacts are authored directly in the repo from the browser.

## What Changes

- **OpenDesign is installed as part of the dev-machine image.** The dev Dockerfile fetches the pinned upstream source (`nexu-io/open-design`, tag `open-design-v0.22.1` — verified current latest release) and builds it at image build time, mirroring the upstream `deploy/Dockerfile` recipe (`pnpm install --frozen-lockfile`, `@open-design/daemon` + `@open-design/web` builds, prod deploy prune) inside the existing single-stage `ubuntu:24.04` image, pruning build leftovers (`pnpm store prune` + cache/temp cleanup) in the same step. Install root is `/opt/open-design` (outside the `dev_home` volume) with a `/usr/local/bin/od` symlink; nothing is provisioned ad-hoc per container.
- **The dev stack starts OpenDesign automatically and keeps it running.** A new supervisord program in `infrastructure/dev/` runs a boot wrapper that starts the OD daemon (`OD_PORT=7456`) and keeps it alive under supervisord.
- **A boot wrapper opens the `design/` project.** On every container start the wrapper waits for the daemon health endpoint, then idempotently binds `/home/dev/workspace/design` as the OD project (it queries the daemon for a project already bound to that directory and only imports when none exists — `od project import` is not idempotent), so OD opens on `design/` and artifacts it creates or edits land in the repo folder. Once imported, the project persists in the daemon's SQLite state under `OD_DATA_DIR`.
- **DeepSeek Harness is wired as OD's agent runtime.** The wrapper runs `od agent setup deepseek-harness` (idempotent) once the daemon is healthy, so OD can drive the already-installed `dsh` CLI as a native runtime. No new secret is threaded into the dev-machine: `dsh` in the dev image is already configured with a model key (via `dsh web`, persisted under the `dev_home` volume).
- **OpenDesign is reachable at `https://dev.gutschi.site:8446` with TLS and dev basic auth.** nginx publishes port `8446` and gets a TLS server block (existing `dev.gutschi.site` certs) proxying to `caddy:8446`; caddy applies the DEV basic auth (`DEV_USERNAME`/`DEV_PASSWORD_HASH`) and reverse-proxies to `dev-machine:7456`. Daemon env: `OD_BIND_HOST=0.0.0.0`, `OD_PORT=7456`, `OD_DATA_DIR=/home/dev/.od`, `OD_DISABLE_API_AUTH=1` (caddy is the authenticator, per upstream docker deployment docs), `OD_ALLOWED_ORIGINS=https://dev.gutschi.site:8446`.
- **The integration smoke suite verifies OpenDesign end to end.** The CI compose override bind-mounts the checked-out `design/` folder into the dev-machine at `/home/dev/workspace/design` (CI boots with `SKIP_GITHUB_BOOTSTRAP=1`, so there is no clone), and the suite checks `https://dev.gutschi.site:8446` through nginx + caddy: HTTP 200 with valid dev credentials, 401 without.
- **Docs and env template updated** (`infrastructure/README.md`, `infrastructure/env.example`) for the new port and daemon env.

## Capabilities

### New Capabilities
- `dev-tools/open-design`: OpenDesign runs inside the dev-machine as part of the dev stack, installed from the pinned upstream build in the dev image, started and kept alive automatically, and reachable at `https://dev.gutschi.site:8446` over TLS behind the dev basic auth. It opens with the repo's `design/` folder as its project (in place, in the repo), with DeepSeek Harness wired as its agent runtime via the already-configured `dsh` install.

### Modified Capabilities
- `testing/stack-smoke-suite`: the stack smoke suite additionally verifies OpenDesign end to end through nginx and caddy — HTTP 200 with valid dev credentials and 401 without. (Base spec note: `openspec/specs/` has no main specs yet; this capability currently exists only as the delta of the in-flight change `integration-smoke-tests`, and this change extends it with the OpenDesign checks.)

## Impact

- `infrastructure/dev/Dockerfile` — fetch + single-stage build/install of OpenDesign (`/opt/open-design`, `/usr/local/bin/od`), runtime deps as needed by the upstream recipe.
- `infrastructure/dev/supervisord.conf` + new boot wrapper script in `infrastructure/dev/` — managed OpenDesign daemon program, project import, dsh agent setup.
- `infrastructure/docker-compose.yml` — nginx host port `8446:8446`, dev-machine environment for the OD daemon.
- `infrastructure/nginx/nginx.conf` — TLS server block on `8446` proxying to `caddy:8446`.
- `infrastructure/caddy/Caddyfile` — `:8446` block with DEV basic auth proxying to `dev-machine:7456`.
- `infrastructure/env.example` / `infrastructure/README.md` — new port and daemon env documentation.
- `integration-test/` package — `docker-compose.ci.yml` override (bind-mount `design/` into dev-machine), `stack.ts`/`infra.tests.ts` OpenDesign checks (`env.test` already carries `DEV_USERNAME`/`DEV_PASSWORD`).
- No production routing/auth changes; no changes to how the existing dev tools (8443–8445) are routed or authenticated; no new secrets in `infrastructure/.env`.
