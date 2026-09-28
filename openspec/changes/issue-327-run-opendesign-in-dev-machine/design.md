## Context

See proposal.md — Why. Current state and constraints that shape the approach:

- **Dev stack routing pattern (8443–8445):** nginx publishes `8443`–`8445` with TLS server blocks (existing `dev.gutschi.site` certs) that proxy to `caddy:<port>`; caddy applies the DEV basic auth (`DEV_USERNAME`/`DEV_PASSWORD_HASH`) and reverse-proxies into `dev-machine:8080|3080|6006`. The caddy service computes its `*_PASSWORD_HASH` placeholders at container start (`caddy hash-password --plaintext "$DEV_PASSWORD"`), so the smoke stack's `env.test` only carries plaintext `DEV_USERNAME`/`DEV_PASSWORD`.
- **dev-machine:** `ubuntu:24.04` runtime Dockerfile that today builds in a single stage (the OpenDesign install adds a dedicated builder stage in front of it); supervisord (`user=dev`, uid 1234) manages `sshd`, `code-server` (:8080), and `dsh web` (:3080, the DeepSeek Harness GUI already configured with a model key persisted under the `dev_home` volume). `dsh` is installed globally in the image (`npm install -g @deepseek-ai/dsh`). The entrypoint clones the repo into `/home/dev/workspace` (skippable via `SKIP_GITHUB_BOOTSTRAP=1`), and `/home/dev` is a named volume (`dev_home`) — only runtime state may live there, everything else must live in the image.
- **Upstream OpenDesign facts (verified at tag `open-design-v0.22.1`, the current latest release):** there is no glibc/Linux artifact and nothing on npm; the only build path is the upstream `deploy/Dockerfile` recipe on `node:24` + pnpm (`pnpm install --frozen-lockfile`, `pnpm --filter @open-design/daemon build` (tsc), `pnpm --filter @open-design/web build` (Next.js static export to `apps/web/out`), `pnpm --filter @open-design/daemon deploy --legacy --prod <dir>` for a pruned prod tree). The daemon is an Express server that serves both the API and the built web UI from one process (default `OD_PORT=7456`); its runtime image installs `tini`, `poppler-utils`, `bash`, `git` and runs unprivileged.
- **Daemon behavior relevant to this design:** binding a non-loopback host requires `OD_API_TOKEN` unless `OD_DISABLE_API_AUTH=1`; browser origins are gated by `OD_ALLOWED_ORIGINS`; runtime state (SQLite: projects/conversations/tabs + artifacts/skills/etc.) lives in `OD_DATA_DIR` (default `<projectRoot>/.od`); the `od` CLI (bin `apps/daemon/bin/od.mjs`) talks to the *running* daemon for `od project import` and `od agent setup deepseek-harness`; `od project import` is **not** idempotent (each run inserts a new project + conversation), but imports never write into the imported folder (OD works in place). Neither flow is driven by this change (see Non-Goals) — they remain available to the developer through the UI or the `od` CLI.
- **DeepSeek Harness as OD runtime (context, not automated here):** `od agent setup deepseek-harness` (idempotent; no-op when already compatible) installs an OD-owned `open-design` profile plugin into the user's dsh profile dir (`$DSH_HOME`/`~/.dsh/profiles/open-design`) so the daemon can drive the locally installed `dsh` CLI over JSONL stdio. OD never stores or reads model keys — credentials stay in dsh's own config.
- **Smoke suite:** CI boots the full stack via `integration-test/docker-compose.ci.yml` with `SKIP_GITHUB_BOOTSTRAP=1` on dev-machine (no clone, fresh `dev_home` volume each run); `env.test` already carries `DEV_USERNAME`/`DEV_PASSWORD`; checks poll until ready and each names its service.

## Goals / Non-Goals

**Goals:**
- A self-contained dev-machine image that already contains a working OpenDesign (`open-design-v0.22.1`) without ad-hoc provisioning, shipping only the compiled runtime tree (no sources, toolchain or package store in the runtime image).
- OpenDesign daemon auto-started and auto-restarted inside dev-machine by supervisord (`od --no-open`) — without ever adding a model key to the dev-machine environment.
- nginx → caddy (DEV basic auth) → dev-machine on `:8446`, following the exact 8443–8445 pattern.
- Smoke coverage: 200 with valid dev credentials, 401 without, through nginx + caddy.

**Non-Goals:**
- Automating the OpenDesign-side setup: importing `/home/dev/workspace/design` as a project and wiring the DeepSeek Harness agent runtime are one-time actions in the OpenDesign UI. (An earlier revision of this change automated both from a boot wrapper; that was dropped to keep the dev-machine boot simple — supervisord runs the daemon directly and nothing else.)
- End-to-end artifact generation in CI (needs a live model) — the smoke suite proves serving + auth only.
- Packaging OpenDesign for other platforms, touching upstream, or changing the 8443–8445 dev tools.
- Migrating or reorganizing `design/` content.

## Decisions

### 1. Image build: dedicated `node:24-bookworm` builder stage, copy the compiled tree into `/opt/open-design`
The OpenDesign build lives in its own stage (`FROM node:24-bookworm AS open-design-builder`) so the build inputs never reach the runtime image and the build itself gets a Node image as base instead of setting Node/pnpm up by hand. One build ARG pins the upstream source, e.g. `ARG OD_VERSION=open-design-v0.22.1`. In the builder stage:
1. installs the native-module fallback toolchain (`python3 make g++ curl ca-certificates`) and fetches the pinned source tarball (`https://github.com/nexu-io/open-design/archive/refs/tags/${OD_VERSION}.tar.gz`), unpacking it into the stage's `/src`;
2. `corepack prepare pnpm@10.33.2 --activate` (match upstream) and `pnpm install --frozen-lockfile` in the source tree;
3. mirrors the upstream recipe: `pnpm --filter @open-design/daemon build`, `pnpm --filter @open-design/web build`, `pnpm --filter @open-design/daemon deploy --legacy --prod /out/apps/daemon` (pruned daemon tree incl. `dist/` + prod `node_modules`), and assembles the runtime tree in `/out`: the daemon deploy tree at `apps/daemon` (so the daemon's `PROJECT_ROOT` resolves to `/opt/open-design`), the web static export at `apps/web/out`, and the content dirs the upstream runtime stage ships (`skills/ design-systems/ craft/ prompt-templates/ data/ assets/frames assets/community-pets plugins/_official`);
4. prunes in the stage: `pnpm store prune`, pnpm/corepack caches, and `.d.ts`/`.map`/test leftovers inside the deployed `node_modules` — so the copy below carries only the pruned deploy tree.

The runtime stage then only adds the result: `COPY --from=open-design-builder /out /opt/open-design`, `chown` to `1234:1234`, and the `od` CLI entry as `/usr/local/bin/od` — a symlink to `apps/daemon/bin/od.mjs` when the deploy tree retains it, otherwise a tiny wrapper (`exec node /opt/open-design/apps/daemon/dist/cli.js "$@"`), since the daemon is normally launched as `node …/dist/cli.js --no-open` upstream.

The builder image is the **Debian** (glibc) `node:24` variant, not alpine: the native modules compiled during the build (`better-sqlite3`, plus `sharp`/`onnxruntime-node`-style prebuilds) must run in the glibc `ubuntu:24.04` runtime stage, and Debian bookworm's older glibc is forward-compatible with Ubuntu 24.04's.
**Alternatives considered:** building inside the runtime stage in one `RUN` (the earlier plan) — rejected: it needs Node/pnpm set up in the same image and keeps the source tree, toolchain and store in the runtime image's build history; copying only the compiled tree keeps the runtime image free of build inputs. `node:24-alpine` — rejected: musl-built native modules would not load in the glibc runtime image.

### 2. Runtime OS dependencies
The upstream runtime stage installs `poppler-utils` in addition to what the dev image already has (`git`, `bash`, supervisor, curl). Add `poppler-utils` to the base apt install list in the dev Dockerfile (daemon PDF/preview features use it). `tini` is not needed — supervisord is PID 1 and manages the daemon process. The daemon runs as `dev` (the image's only user), matching how code-server/dsh run and letting it write `OD_DATA_DIR=/home/dev/.od`.

### 3. Lifecycle: supervisord runs the daemon directly
`infrastructure/dev/supervisord.conf` gets a `[program:opendesign]` entry with `command=od --no-open` (`autostart=true`, `autorestart=true`, logs to stdout/stderr like the other programs). Supervisord keeps the daemon in the foreground and restarts it if it exits, so the "starts with the dev-machine / restarts after a stop" requirement needs no helper script: no wrapper file is COPYed, and the image only carries `entrypoint.sh` next to `supervisord.conf`.

The daemon env is exported by the dev-machine entrypoint (`infrastructure/dev/entrypoint.sh`, before `exec supervisord`), so every supervisord program inherits it and nothing is hardcoded in the program command.
**Alternatives considered:** a boot wrapper script owning daemon start, health polling, project import and dsh wiring (the earlier plan) — dropped: the script, the health-poll loop and the PID/signal forwarding existed only to run one-time setup against a healthy daemon, and that setup is now a Non-Goal, so `od --no-open` under supervisord is the whole lifecycle. A separate "boot setup" program — dropped with it.

### 4. Reachability and daemon env (`8446` end to end)
- **dev-machine env (`infrastructure/dev/entrypoint.sh`):** the entrypoint exports `OD_BIND_HOST=0.0.0.0`, `OD_PORT=7456`, `OD_DATA_DIR=/home/dev/.od`, `OD_DISABLE_API_AUTH=1`, `OD_ALLOWED_ORIGINS=https://dev.gutschi.site:8446` before starting supervisord, so the `od` program inherits them. (`OD_DISABLE_API_AUTH=1` is required because the daemon binds a non-loopback host, and caddy is the authenticator — this mirrors the upstream docker deployment docs.)
- **compose (`infrastructure/docker-compose.yml`):** add `"8446:8446"` to the nginx service `ports:`. No port publish for 7456 itself: caddy reaches `dev-machine:7456` over the compose network.
- **nginx (`infrastructure/nginx/nginx.conf`):** a TLS server block on `8446` using the existing `dev.gutschi.site` certs, `proxy_pass http://caddy:8446`, with the same headers as the 8444 block (`Host $http_host`, `X-Forwarded-*`, `Upgrade`/`Connection` for WebSocket/SSE support, `proxy_buffering off` + long read/send timeouts).
- **caddy (`infrastructure/caddy/Caddyfile`):** a `:8446` block with the DEV `basic_auth` and `reverse_proxy dev-machine:7456`, mirroring `:8444`. No new secrets: `DEV_USERNAME`/`DEV_PASSWORD_HASH` already flow from the environment (real `.env` in prod, computed hashes in the smoke stack).
- **`infrastructure/env.example`:** document the new dev-machine keys with `OD_*` defaults; **no** `DEEPSEEK_API_KEY` entry is added (dsh in the dev image already holds the model config under `dev_home`).

### 5. Smoke suite
- **CI override (`integration-test/docker-compose.ci.yml`):** on `dev-machine` add a bind mount of the checked-out folder `../design` to `/home/dev/workspace/design` (read-write; compose appends it to the base `dev_home:/home/dev` volume mount) so the repo's design folder is present in the smoke stack. A read-only mount was considered and rejected: OD may write project-local state in place, and a `:ro` failure inside the daemon would be harder to diagnose than a disposable writable CI folder.
- **`stack.ts`:** expose the OpenDesign URL (`https://127.0.0.1:8446`) and dev credentials (`DEV_USERNAME`/`DEV_PASSWORD`, falling back to `dev`/empty) with a `devAuth` helper, mirroring the existing `adminAuth`.
- **`infra.tests.ts`:** a new test (same poll-until-ready pattern as the other UI checks, `NODE_TLS_REJECT_UNAUTHORIZED=0` context) asserting `https://127.0.0.1:8446` returns 200 with valid dev basic auth, plus an unauthenticated request returning 401. Requests traverse nginx (`:8446` TLS) → caddy (basic auth) → daemon. Polling handles the supervisord + daemon startup window; when the check finally fails it names OpenDesign.
- The daemon state dir `/home/dev/.od` lives on the fresh `dev_home` volume in CI, so each smoke run starts from a clean OpenDesign state.

## Risks / Trade-offs

- [Dev-image build gets noticeably heavier/slower (source download + pnpm install of the whole upstream monorepo + two builds)] → the build runs in its own `node:24-bookworm` stage, which pins the tag and keeps `pnpm store prune`, the source tree and the toolchain out of the runtime image: the runtime layer only receives the pruned `/out` tree.
- [Upstream layout drift between the pinned tag and what our Dockerfile expects (bin path, deploy output, content dirs)] → pin the exact tag and verify the installed `od` entry at implementation time (task has an explicit verify step); bumping versions becomes a deliberate, reviewed change.
- [`/usr/local/bin/od` shadows coreutils `od` (octal dump) inside the dev-machine] → accepted: the OpenDesign CLI name is upstream's; `od`-as-octal-dump users in the dev container can use the coreutils path explicitly. Matches the issue's stated symlink.
- [caddy `:8446` and nginx `8446` could conflict with anything already published] → 8446 is free in the current compose/nginx/caddy files (checked); adding the port follows the existing 8443–8445 pattern.

## Migration Plan

- **Deploy:** rebuild the dev-machine image (`docker compose build dev-machine`), then `docker compose up -d dev-machine nginx caddy` so the new supervisord program, the `8446` publishes/blocks and the entrypoint `OD_*` env all take effect. First boot creates `/home/dev/.od`; opening `design/` as a project in the UI is a one-time manual step.
- **Rollback:** remove the `[program:opendesign]` block, the `OD_*` exports and the `8446` port/blocks, and rebuild. `/home/dev/.od` can be left or deleted; `design/` content is never modified by OpenDesign.
- No production routing or auth is affected; certbot renewal for `dev.gutschi.site` already covers the 8446 cert (same cert files as 8443–8445).

## Open Questions

None that affect the specs, approach, or task breakdown. (Remaining unknowns — e.g. whether the pruned deploy tree retains `bin/od.mjs`, which decides between the `od` symlink and the wrapper fallback — are resolved by a verify step inside the first implementation task and do not change the plan.)
