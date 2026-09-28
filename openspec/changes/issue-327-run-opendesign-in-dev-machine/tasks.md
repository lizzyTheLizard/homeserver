## 1. Dev-image install of OpenDesign

- [x] 1.1 Add a pinned fetch-and-build builder stage to `infrastructure/dev/Dockerfile` (`FROM node:24-bookworm AS open-design-builder`; `ARG OD_VERSION=open-design-v0.22.1`; download the tag tarball and unpack it into the stage; `corepack prepare pnpm@10.33.2`; `pnpm install --frozen-lockfile`; `pnpm --filter @open-design/daemon build` + `pnpm --filter @open-design/web build`; `pnpm --filter @open-design/daemon deploy --legacy --prod /out/apps/daemon` and copy the web `out/` + content dirs into `/out`; then delete the source tree and run `pnpm store prune` in that stage) and copy only the assembled tree into the runtime stage (`COPY --from=open-design-builder /out /opt/open-design`), and verify `docker build infrastructure/dev` succeeds and `/opt/open-design` contains the daemon dist and the web static export
- [x] 1.2 Add the runtime OS dependency `poppler-utils` to the dev image's apt install and expose the `od` CLI as `/usr/local/bin/od` (symlink to the deployed `apps/daemon/bin/od.mjs`, or a wrapper `exec node /opt/open-design/apps/daemon/dist/cli.js "$@"` if the pruned deploy tree drops the bin) and verify inside the built image that the installed daemon reports the pinned OpenDesign version (`node -p "require('/opt/open-design/apps/daemon/package.json').version"`, or `od version` against the running daemon — upstream `od` has no `--version` flag) and `/opt/open-design` is present outside `/home/dev`

## 2. Boot lifecycle inside dev-machine

- [x] 2.1 Add the `[program:opendesign]` block to `infrastructure/dev/supervisord.conf` (`command=od --no-open`, autostart, autorestart, stdout/stderr logs) so supervisord starts and restarts the daemon directly — no helper script — and verify `docker compose build dev-machine` succeeds, `docker compose up -d dev-machine` shows the OpenDesign program running (`supervisorctl status`) and `/api/health` answers inside the container
- [x] 2.2 Export the OpenDesign daemon env in `infrastructure/dev/entrypoint.sh` (`OD_BIND_HOST=0.0.0.0`, `OD_PORT=7456`, `OD_DATA_DIR=/home/dev/.od`, `OD_DISABLE_API_AUTH=1`, `OD_ALLOWED_ORIGINS=https://dev.gutschi.site:8446`) before `exec supervisord`, and verify the supervisord programs inherit it (daemon binds `7456`, API auth disabled)

## 3. Reachability wiring (nginx → caddy → dev-machine on 8446)

- [x] 3.1 Add the `8446:8446` port to the `nginx` service in `infrastructure/docker-compose.yml`, and verify `docker compose config` resolves it and that 7456 is not published to the host
- [x] 3.2 Add the TLS server block on `8446` to `infrastructure/nginx/nginx.conf` (existing `dev.gutschi.site` certs, `proxy_pass http://caddy:8446`, 8444-style headers incl. `Upgrade`/`Connection`, `proxy_buffering off`) and the `:8446` DEV basic-auth block to `infrastructure/caddy/Caddyfile` (`reverse_proxy dev-machine:7456`), and verify against the running stack that `https://dev.gutschi.site:8446` returns 401 unauthenticated and 200 with the dev basic-auth credentials
- [x] 3.3 Document the OpenDesign dev-machine setup (`od` install location, the `[program:opendesign]` entry, the `OD_*` keys exported by `dev/entrypoint.sh`, `/home/dev/.od` state) and the 8446 port in `infrastructure/README.md` — `env.example` stays `.env`-only because the `OD_*` keys are not read from `.env` — and verify the documented ports/credentials match the implemented config

## 4. Integration smoke suite

- [x] 4.1 Extend `integration-test/src/stack.ts` with the OpenDesign URL (`https://127.0.0.1:8446`) and the dev basic-auth credentials from `DEV_USERNAME`/`DEV_PASSWORD` (`devAuth` helper mirroring `adminAuth`), and verify the values load from `integration-test/env.test`
- [x] 4.2 Add the bind mount of `../design` to `/home/dev/workspace/design` on the `dev-machine` service in `integration-test/docker-compose.ci.yml` (alongside the existing `SKIP_GITHUB_BOOTSTRAP: "1"`), and verify `docker compose -f infrastructure/docker-compose.yml -f integration-test/docker-compose.ci.yml config` includes the mount
- [x] 4.3 Add the OpenDesign checks to `integration-test/src/infra.tests.ts` (poll `https://127.0.0.1:8446` until the daemon is up: 200 with the dev credentials, 401 without, check named OpenDesign), and verify against the running smoke stack that both assertions pass and the OpenDesign check fails independently when the daemon is stopped

## 5. Docs and repo-wide verification

- [x] 5.1 Update `infrastructure/README.md` (and the root `README.md` if it lists the dev tools) documenting OpenDesign in the dev stack on `https://dev.gutschi.site:8446`, and verify the documented ports/credentials match the implemented config
- [x] 5.2 Run the repo checks affected by the change (`pnpm lint:ci`) and validate both compose files (`docker compose config` with the dev and smoke overrides), and verify `git status` shows only the intended files
