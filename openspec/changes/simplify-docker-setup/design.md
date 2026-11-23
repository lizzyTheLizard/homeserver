# Design

## Context

Both application Dockerfiles use the Next.js `output: 'standalone'` layout in a pnpm workspace: standalone output nests the app under `services/<name>/`, so the runtime working directory is `/app/services/<name>` and `static/`, `public/` and `db/` are copied in beside `server.js`. Differences today: `public/` (web only), four revision `ARG`/`ENV`s (web only, switched by `revision-build-args` in `ci.yml` and set by hand in `pull-request.yml`), and the service name. `.dockerignore` already sits at the repository root and the build context is already `.`.

The backup image is `node:alpine` + `postgresql16-client` + five scripts copied to `/usr/local/bin`. It is built on the server by compose (`build: ./db-backup`), not published. The deploy rsyncs `infrastructure/` to the host and runs `docker compose up -d --force-recreate`, so mounted scripts arrive with every deploy. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One Dockerfile for web and Wichteln, one build stage plus one runtime stage, no per-service edits.
- The backup Dockerfile reduced to what cannot be mounted.

**Non-Goals:**
- No build tool other than a Dockerfile (Buildpacks, `pnpm deploy`, `dockerfile_inline` in compose): they were evaluated and rejected, see below.
- `services/dev-machine/Dockerfile` stays; it is a different kind of image.
- No change to image names, tags, ports, runtime environment or the backup's behaviour.

## Decisions

**Shared root `Dockerfile` with `ARG SERVICE`.** The file lives at the repository root (it needs the root manifests and lockfile anyway, and `.dockerignore` is already there). Callers pass `SERVICE=web|wichteln`; the runtime stage sets `WORKDIR /app/services/${SERVICE}` and `CMD ["node", "server.js"]`. Alternative: keep two files and share through an include mechanism — Dockerfiles have none.

**Single build stage.** Order: copy root `package.json`, lockfile, `pnpm-workspace.yaml` and `services/*/package.json` manifests, run `pnpm install --frozen-lockfile --filter @homeserver/${SERVICE}...`, then copy `services/${SERVICE}` and build. The layer cache behaves like the separate `deps` stage (install reruns only when manifests change) and the `COPY --from=deps` lines disappear. Alternative: keep `deps` + `builder`; rejected, the split only existed to move `node_modules` between stages. The manifest copy lists both packages explicitly because `COPY` cannot glob a directory level while keeping its structure. The pnpm install and `libc6-compat` choices are verified during implementation: `libc6-compat` is dropped if both builds and a start pass without it.

**Revision args for both application images.** The four `ARG`/`ENV` lines are in the shared file, so Wichteln gets them too. This removes the `revision-build-args` matrix switch and the conditional step in `ci.yml`. They are placed in the runtime stage after all expensive layers so changing them never invalidates the build cache.

**Empty `services/wichteln/public/`.** Keeps the Dockerfile free of conditionals; a `.gitkeep` makes git track the folder. Alternative: `COPY ... public* ` tricks or a `RUN mkdir` in the build stage; rejected as obscure.

**Change detection.** `detect-changes.mjs` gets a small set of "application image" files (`Dockerfile`) that flags `web` and `wichteln` only. Adding it to the shared workspace files would also rebuild the development machine, which does not use it.

**Backup: keep a two-line Dockerfile, mount the scripts.** The scripts are `.mjs` (Node.js) and `backup.sh` needs `pg_dump`, so the image needs both. No official image has both: `postgres:16-alpine` has no Node.js, `node:alpine` has no client. Options considered: (a) install Node.js into the postgres image or the client into the node image at container start — slow, needs the network on every start, can fail at boot; (b) rewrite the three `.mjs` scripts in shell with `curl`/`jq` — large rewrite of tested OAuth and upload logic for no behavioural gain; (c) `dockerfile_inline` in compose — rejected by the user; (d) keep `FROM node` + `apk add postgresql16-client` and mount the scripts. Chosen: (d). The scripts are mounted read-only at `/opt/backup` (not `/usr/local/bin`, which holds `node`). The Dockerfile keeps the version-sync comment about the PostgreSQL major. The entrypoint, cron line, `backup.sh`'s call to the upload script and the documented commands use the new path. Git does not track the executable bit today (mode 644, the Dockerfile ran `chmod`), so the files are committed as executable.

## Risks / Trade-offs

- [Shared Dockerfile change affects both services] → change detection rebuilds both in the pull request and the stack start proves they run.
- [`pnpm install --filter` resolves differently from the full install] → verify with `docker build` of both services and a container start before the diff is reviewed.
- [Mounted scripts: a missing executable bit or wrong path fails at runtime, not build time] → the stack start in the pull request starts the backup container and its healthcheck (`crond` running); task list includes running `backup.sh`/`restore-backup.mjs --help` style checks by hand.
- [Anyone with `docker compose exec backup node /usr/local/bin/...` in their shell history] → README and script header comments updated; the commands fail loudly with "not found".

## Migration Plan

Merge, and the deploy rsyncs `infrastructure/` and recreates the stack. The first deploy rebuilds the backup image (new Dockerfile) and starts it with the mount. Rollback: revert the commit; the previous Dockerfiles and compose file return together.
