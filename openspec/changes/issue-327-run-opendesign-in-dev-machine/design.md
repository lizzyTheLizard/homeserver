## Context

See proposal.md — Why. Current state and constraints that shape the approach:

- **Dev stack routing pattern (8443–8445):** nginx publishes `8443`–`8445` with TLS server blocks (existing `dev.gutschi.site` certs) that proxy to `caddy:<port>`; caddy applies the DEV basic auth (`DEV_USERNAME`/`DEV_PASSWORD_HASH`) and reverse-proxies into `dev-machine:8080|3080|6006`. The caddy service computes its `*_PASSWORD_HASH` placeholders at container start (`caddy hash-password --plaintext "$DEV_PASSWORD"`), so the smoke stack's `env.test` only carries plaintext `DEV_USERNAME`/`DEV_PASSWORD`.
- **dev-machine:** `ubuntu:24.04` single-stage Dockerfile; supervisord (`user=dev`, uid 1234) manages `sshd`, `code-server` (:8080), and `dsh web` (:3080, the DeepSeek Harness GUI already configured with a model key persisted under the `dev_home` volume). `dsh` is installed globally in the image (`npm install -g @deepseek-ai/dsh`). The entrypoint clones the repo into `/home/dev/workspace` (skippable via `SKIP_GITHUB_BOOTSTRAP=1`), and `/home/dev` is a named volume (`dev_home`) — only runtime state may live there, everything else must live in the image.
- **Upstream OpenDesign facts (verified at tag `open-design-v0.22.1`, the current latest release):** there is no glibc/Linux artifact and nothing on npm; the only build path is the upstream `deploy/Dockerfile` recipe on `node:24` + pnpm (`pnpm install --frozen-lockfile`, `pnpm --filter @open-design/daemon build` (tsc), `pnpm --filter @open-design/web build` (Next.js static export to `apps/web/out`), `pnpm --filter @open-design/daemon deploy --legacy --prod <dir>` for a pruned prod tree). The daemon is an Express server that serves both the API and the built web UI from one process (default `OD_PORT=7456`); its runtime image installs `tini`, `poppler-utils`, `bash`, `git` and runs unprivileged.
- **Daemon behavior relevant to this design:** binding a non-loopback host requires `OD_API_TOKEN` unless `OD_DISABLE_API_AUTH=1`; browser origins are gated by `OD_ALLOWED_ORIGINS`; runtime state (SQLite: projects/conversations/tabs + artifacts/skills/etc.) lives in `OD_DATA_DIR` (default `<projectRoot>/.od`); the `od` CLI (bin `apps/daemon/bin/od.mjs`) talks to the *running* daemon for `od project import` and `od agent setup deepseek-harness`; `od project import` is **not** idempotent (each run inserts a new project + conversation), but imports never write into the imported folder (OD works in place).
- **DeepSeek Harness as OD runtime:** `od agent setup deepseek-harness` (idempotent; no-op when already compatible) installs an OD-owned `open-design` profile plugin into the user's dsh profile dir (`$DSH_HOME`/`~/.dsh/profiles/open-design`) so the daemon can drive the locally installed `dsh` CLI over JSONL stdio. OD never stores or reads model keys — credentials stay in dsh's own config.
- **Smoke suite:** CI boots the full stack via `integration-test/docker-compose.ci.yml` with `SKIP_GITHUB_BOOTSTRAP=1` on dev-machine (no clone, fresh `dev_home` volume each run); `env.test` already carries `DEV_USERNAME`/`DEV_PASSWORD`; checks poll until ready and each names its service.

## Goals / Non-Goals

**Goals:**
- A self-contained dev-machine image that already contains a working OpenDesign (`open-design-v0.22.1`) without ad-hoc provisioning, keeping build leftovers out of the final layers where possible.
- OpenDesign daemon auto-started and auto-restarted inside dev-machine with a boot wrapper that idempotently opens `/home/dev/workspace/design` and wires dsh — without ever adding a model key to the dev-machine environment.
- nginx → caddy (DEV basic auth) → dev-machine on `:8446`, following the exact 8443–8445 pattern.
- Smoke coverage: 200 with valid dev credentials, 401 without, through nginx + caddy; CI bind-mounts `design/` so the project path exists.

**Non-Goals:**
- End-to-end artifact generation in CI (needs a live model) — the smoke suite proves serving + auth only.
- Packaging OpenDesign for other platforms, touching upstream, or changing the 8443–8445 dev tools.
- Migrating or reorganizing `design/` content.

## Decisions

### 1. Image build: single-stage fetch-and-build under `/opt/open-design`, then prune
The dev Dockerfile stays single-stage (`ubuntu:24.04`, node 24 from NodeSource). One build ARG pins the upstream source, e.g. `ARG OD_VERSION=open-design-v0.22.1`. At image build time (after the Node/pnpm layer exists) the Dockerfile:
1. fetches the pinned source tarball (`https://github.com/nexu-io/open-design/archive/refs/tags/${OD_VERSION}.tar.gz`) and unpacks it to `/opt/open-design-src` (outside `/home/dev` — satisfies the volume constraint);
2. `corepack prepare pnpm@10.33.2 --activate` (match upstream) and `pnpm install --frozen-lockfile` in the source tree;
3. mirrors the upstream recipe: `pnpm --filter @open-design/daemon build`, `pnpm --filter @open-design/web build`, `pnpm --filter @open-design/daemon deploy --legacy --prod /opt/open-design` (pruned daemon tree incl. `dist/` + prod `node_modules`), copy `apps/web/out` and the content dirs the runtime stage ships (`skills/ design-systems/ craft/ prompt-templates/ assets/ data/ plugins/_official`) into `/opt/open-design`;
4. prunes aggressively in the same RUN: `pnpm store prune`, delete `/opt/open-design-src` and any `.d.ts`/`.map`/test leftovers, plus `corepack`/pnpm caches.

The `od` CLI entry is then exposed as `/usr/local/bin/od`. If the pruned deploy tree retains `apps/daemon/bin/od.mjs` it is symlinked; otherwise a tiny `/usr/local/bin/od` wrapper (`exec node /opt/open-design/daemon/dist/cli.js "$@"`) is installed instead — the exact target is verified during implementation, since the daemon is normally launched as `node …/dist/cli.js --no-open` upstream.
**Alternatives considered:** using the upstream `node:24-alpine` Docker image or copying its build output — rejected: the dev image is glibc `ubuntu:24.04`, and OD must run inside the dev-machine container, so it must be built on the same base/toolchain. A multi-stage builder (`node:24-bookworm`) — rejected by decision: keep the existing simple single-stage Dockerfile; the build-time/size cost is mitigated by the pruning above (the OD build result is the only thing that persists, not the source tree or pnpm store).

### 2. Runtime OS dependencies
The upstream runtime stage installs `poppler-utils` in addition to what the dev image already has (`git`, `bash`, supervisor, curl). Add `poppler-utils` to the base apt install list in the dev Dockerfile (daemon PDF/preview features use it). `tini` is not needed — supervisord is PID 1 and manages the daemon process. The daemon runs as `dev` (the image's only user), matching how code-server/dsh run and letting it write `OD_DATA_DIR=/home/dev/.od`.

### 3. Lifecycle: one supervisord program running a boot wrapper
`infrastructure/dev/supervisord.conf` gets a `[program:opendesign]` entry (`autostart=true`, `autorestart=true`, logs to stdout/stderr like the other programs) that executes a new committed script `infrastructure/dev/opendesign.sh` (COPYed into the image and chmod +x, alongside `entrypoint.sh`). The wrapper:
1. starts the daemon in the background (`od --no-open`, i.e. the deployed `dist/cli.js`) and traps TERM/INT to forward to it;
2. polls `http://127.0.0.1:7456/api/health` until healthy (bounded retries; on failure exits non-zero so supervisord restarts the program);
3. idempotently binds the project: asks the daemon for projects and checks whether any is bound to `/home/dev/workspace/design` (via the daemon API / `od project list --json`); only when none exists runs `od project import /home/dev/workspace/design` (the import is otherwise not idempotent — naive per-boot imports would accumulate duplicate projects). Import failure is logged and does not abort serving, but is retried on the next program restart;
4. best-effort `od agent setup deepseek-harness` (idempotent `already-compatible` no-op after first success) — requires the daemon to be up, so it runs after step 2; failure is logged and non-fatal per the spec;
5. `wait`s on the daemon PID, so the wrapper stays in the foreground and supervisord's `autorestart` re-runs the whole sequence if the daemon dies.

The daemon's env comes from the container environment (compose `environment:` on dev-machine), not hardcoded in the script.
**Alternatives considered:** separate supervisord programs for "daemon" and "boot setup" — rejected: project import and agent setup require the daemon to be healthy first; a single wrapper keeps that ordering and lets a supervisord restart re-run the whole boot sequence (self-healing). Importing on first boot only (marker file) — rejected: per-boot check-then-import is simpler and stateless.

### 4. Reachability and daemon env (`8446` end to end)
- **compose (`infrastructure/docker-compose.yml`):** add `"8446:8446"` to the nginx service `ports:`; on `dev-machine` add environment: `OD_BIND_HOST=0.0.0.0`, `OD_PORT=7456`, `OD_DATA_DIR=/home/dev/.od`, `OD_DISABLE_API_AUTH=1`, `OD_ALLOWED_ORIGINS=https://dev.gutschi.site:8446`. (`OD_DISABLE_API_AUTH=1` is required because the daemon binds a non-loopback host, and caddy is the authenticator — this mirrors the upstream docker deployment docs. No port publish for 7456 itself: caddy reaches `dev-machine:7456` over the compose network.)
- **nginx (`infrastructure/nginx/nginx.conf`):** a TLS server block on `8446` using the existing `dev.gutschi.site` certs, `proxy_pass http://caddy:8446`, with the same headers as the 8444 block (`Host $http_host`, `X-Forwarded-*`, `Upgrade`/`Connection` for WebSocket/SSE support, `proxy_buffering off` + long read/send timeouts).
- **caddy (`infrastructure/caddy/Caddyfile`):** a `:8446` block with the DEV `basic_auth` and `reverse_proxy dev-machine:7456`, mirroring `:8444`. No new secrets: `DEV_USERNAME`/`DEV_PASSWORD_HASH` already flow from the environment (real `.env` in prod, computed hashes in the smoke stack).
- **`infrastructure/env.example`:** document the new dev-machine keys with `OD_*` defaults; **no** `DEEPSEEK_API_KEY` entry is added (dsh in the dev image already holds the model config under `dev_home`).

### 5. Smoke suite
- **CI override (`integration-test/docker-compose.ci.yml`):** on `dev-machine` add a bind mount of the checked-out folder `../design` to `/home/dev/workspace/design` (read-write; compose appends it to the base `dev_home:/home/dev` volume mount). CI runs with `SKIP_GITHUB_BOOTSTRAP=1`, so without this mount the project path would not exist. A read-only mount was considered and rejected: OD may write project-local state in place, and a `:ro` failure inside the daemon would be harder to diagnose than a disposable writable CI folder.
- **`stack.ts`:** expose the OpenDesign URL (`https://127.0.0.1:8446`) and dev credentials (`DEV_USERNAME`/`DEV_PASSWORD`, falling back to `dev`/empty) with a `devAuth` helper, mirroring the existing `adminAuth`.
- **`infra.tests.ts`:** a new test (same poll-until-ready pattern as the other UI checks, `NODE_TLS_REJECT_UNAUTHORIZED=0` context) asserting `https://127.0.0.1:8446` returns 200 with valid dev basic auth, plus an unauthenticated request returning 401. Requests traverse nginx (`:8446` TLS) → caddy (basic auth) → daemon. Polling handles the supervisord + daemon + import startup window; when the check finally fails it names OpenDesign.
- The daemon state dir `/home/dev/.od` lives on the fresh `dev_home` volume in CI, so each smoke run exercises the first-boot import against the bind-mounted `design/` folder.

## Risks / Trade-offs

- [Dev-image build gets noticeably heavier/slower (source download + pnpm install of the whole upstream monorepo + two builds)] → pinned tag + single RUN with `pnpm store prune` and source-tree deletion keeps only the pruned deploy tree; acceptable per decision; if it ever hurts, switch to the multi-stage builder variant.
- [Upstream layout drift between the pinned tag and what our Dockerfile expects (bin path, deploy output, content dirs)] → pin the exact tag and verify the installed `od` entry at implementation time (task has an explicit verify step); bumping versions becomes a deliberate, reviewed change.
- [`/usr/local/bin/od` shadows coreutils `od` (octal dump) inside the dev-machine] → accepted: the OpenDesign CLI name is upstream's; `od`-as-octal-dump users in the dev container can use the coreutils path explicitly. Matches the issue's stated symlink.
- [Project-import check depends on the daemon API shape (`od project list --json` / project metadata)] → the wrapper treats "cannot determine existing binding" as "needs import" only when list clearly shows no binding; both directions are logged, and duplicates are a cosmetic SQLite-state issue, not data loss.
- [Agent wiring is best-effort and unverifiable in CI (no live model)] → setup is idempotent and non-fatal; the smoke suite proves serving + auth only, per the issue's out-of-scope note.
- [caddy `:8446` and nginx `8446` could conflict with anything already published] → 8446 is free in the current compose/nginx/caddy files (checked); adding the port follows the existing 8443–8445 pattern.

## Migration Plan

- **Deploy:** rebuild the dev-machine image (`docker compose build dev-machine`), then `docker compose up -d dev-machine nginx caddy` so the new supervisord program, the `8446` publishes/blocks, and the dev-machine env all take effect. First boot of an existing dev container creates `/home/dev/.od` and imports the design project; later boots reuse it.
- **Rollback:** remove the `[program:opendesign]` block + boot wrapper, the `OD_*` env and `8446` port/blocks, and rebuild. `/home/dev/.od` can be left or deleted; `design/` content is never modified by the import.
- No production routing or auth is affected; certbot renewal for `dev.gutschi.site` already covers the 8446 cert (same cert files as 8443–8445).

## Open Questions

None that affect the specs, approach, or task breakdown. (Remaining unknowns — e.g. whether the pruned deploy tree retains `bin/od.mjs`, or the exact daemon project-list response shape — are resolved by a verify step inside the first implementation task and do not change the plan.)
