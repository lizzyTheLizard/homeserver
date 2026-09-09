## 1. Dev-image install of OpenDesign

- [ ] 1.1 Add a pinned fetch-and-build step to `infrastructure/dev/Dockerfile` (`ARG OD_VERSION=open-design-v0.22.1`; download the tag tarball to `/opt/open-design-src`; `corepack prepare pnpm@10.33.2`; `pnpm install --frozen-lockfile`; `pnpm --filter @open-design/daemon build` + `pnpm --filter @open-design/web build`; `pnpm --filter @open-design/daemon deploy --legacy --prod /opt/open-design` and copy the web `out/` + content dirs; then delete the source tree and run `pnpm store prune` in the same RUN) and verify `docker build infrastructure/dev` succeeds and `/opt/open-design` contains the daemon dist and the web static export
- [ ] 1.2 Add the runtime OS dependency `poppler-utils` to the dev image's apt install and expose the `od` CLI as `/usr/local/bin/od` (symlink to the deployed `apps/daemon/bin/od.mjs`, or a wrapper `exec node /opt/open-design/daemon/dist/cli.js "$@"` if the pruned deploy tree drops the bin) and verify inside the built image `od --version` reports the pinned OpenDesign version and `/opt/open-design` is present outside `/home/dev`

## 2. Boot lifecycle inside dev-machine

- [ ] 2.1 Commit `infrastructure/dev/opendesign.sh` — the boot wrapper that starts the daemon (`od --no-open`) in the background, polls `http://127.0.0.1:7456/api/health` until healthy (bounded retries, then exits for supervisord to restart), binds `/home/dev/workspace/design` only when no project bound to that folder exists (`od project import` is not idempotent), runs `od agent setup deepseek-harness` best-effort, and foreground-waits on the daemon forwarding TERM/INT — and verify with `sh -n` plus a container run in which two consecutive wrapper starts leave exactly one bound project and a healthy daemon
- [ ] 2.2 Add the `[program:opendesign]` block to `infrastructure/dev/supervisord.conf` (autostart, autorestart, stdout/stderr logs) and COPY `opendesign.sh` into the image next to `entrypoint.sh`, and verify `docker compose build dev-machine` succeeds and `docker compose up -d dev-machine` shows the opendesign program running under supervisord with the daemon healthy (`supervisorctl status` / `/api/health` from inside the container)

## 3. Reachability wiring (nginx → caddy → dev-machine on 8446)

- [ ] 3.1 Add the daemon env (`OD_BIND_HOST=0.0.0.0`, `OD_PORT=7456`, `OD_DATA_DIR=/home/dev/.od`, `OD_DISABLE_API_AUTH=1`, `OD_ALLOWED_ORIGINS=https://dev.gutschi.site:8446`) to the `dev-machine` service and the `8446:8446` port to the `nginx` service in `infrastructure/docker-compose.yml`, and verify `docker compose config` resolves the new entries and 7456 is not published to the host
- [ ] 3.2 Add the TLS server block on `8446` to `infrastructure/nginx/nginx.conf` (existing `dev.gutschi.site` certs, `proxy_pass http://caddy:8446`, 8444-style headers incl. `Upgrade`/`Connection`, `proxy_buffering off`) and the `:8446` DEV basic-auth block to `infrastructure/caddy/Caddyfile` (`reverse_proxy dev-machine:7456`), and verify against the running stack that `https://dev.gutschi.site:8446` returns 401 unauthenticated and 200 with the dev basic-auth credentials
- [ ] 3.3 Document the new `OD_*` dev-machine keys and the 8446 port in `infrastructure/env.example` (no `DEEPSEEK_API_KEY`), and verify `docker compose --env-file infrastructure/env.example config` parses with the placeholder values

## 4. Integration smoke suite

- [ ] 4.1 Extend `integration-test/src/stack.ts` with the OpenDesign URL (`https://127.0.0.1:8446`) and the dev basic-auth credentials from `DEV_USERNAME`/`DEV_PASSWORD` (`devAuth` helper mirroring `adminAuth`), and verify the values load from `integration-test/env.test`
- [ ] 4.2 Add the bind mount of `../design` to `/home/dev/workspace/design` on the `dev-machine` service in `integration-test/docker-compose.ci.yml` (alongside the existing `SKIP_GITHUB_BOOTSTRAP: "1"`), and verify `docker compose -f infrastructure/docker-compose.yml -f integration-test/docker-compose.ci.yml config` includes the mount
- [ ] 4.3 Add the OpenDesign checks to `integration-test/src/infra.tests.ts` (poll `https://127.0.0.1:8446` until the daemon is up: 200 with the dev credentials, 401 without, check named OpenDesign), and verify against the running smoke stack that both assertions pass and the OpenDesign check fails independently when the daemon is stopped

## 5. Docs and repo-wide verification

- [ ] 5.1 Update `infrastructure/README.md` (and the root `README.md` if it lists the dev tools) documenting OpenDesign in the dev stack on `https://dev.gutschi.site:8446`, and verify the documented ports/credentials match the implemented config
- [ ] 5.2 Run the repo checks affected by the change (`pnpm lint:ci`) and validate both compose files (`docker compose config` with the dev and smoke overrides), and verify `git status` shows only the intended files
