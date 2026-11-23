# Design

## Context

Both application Dockerfiles use the Next.js `output: 'standalone'` layout in a pnpm workspace: standalone output nests the app under `services/<name>/`, so the runtime working directory is `/app/services/<name>` and `static/`, `public/` and `db/` are copied in beside `server.js`. Differences today: `public/` (web only), four revision `ARG`/`ENV`s (web only, switched by `revision-build-args` in `ci.yml` and set by hand in `pull-request.yml`), and the service name. `.dockerignore` already sits at the repository root and the build context is already `.`.

The backup lives in `infrastructure/db-backup/` and is built on the server by compose (`build: ./db-backup`); the deploy rsyncs `infrastructure/` and recreates the stack. It is `node:alpine` + `postgresql16-client` + five scripts (three Node.js `.mjs` with no npm dependencies, two shell). Its only tests-by-hand are manual runs. Change detection (`detect-changes.mjs`) knows `web`, `wichteln` and `dev-machine` services plus `infrastructure`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One Dockerfile for web and Wichteln, one build stage plus one runtime stage, no per-service edits.
- The backup is a first-class workspace package: linted with the shared configuration, unit-tested, built and published by the same pipelines.

**Non-Goals:**
- No build tool other than Dockerfiles (Buildpacks, `pnpm deploy`, `dockerfile_inline` in compose) and no attempt to fit the backup into the shared Dockerfile: its runtime (root user for `crond`, `pg_dump`, no Next.js output) differs in every part that is not the base image.
- `services/dev-machine` is not touched.
- No TypeScript conversion and no rewrite of the backup scripts in another language; no change to backup behaviour, schedule or environment variables.

## Decisions

**Shared root `Dockerfile` with `ARG SERVICE` for web and Wichteln.** The file lives at the repository root (it needs the root manifests and lockfile anyway, and `.dockerignore` is already there). Callers pass `SERVICE=web|wichteln`; the runtime stage sets `WORKDIR /app/services/${SERVICE}` and `CMD ["node", "server.js"]`. Alternative: keep two files and share through an include mechanism — Dockerfiles have none.

**Single build stage.** Order: copy root `package.json`, lockfile, `pnpm-workspace.yaml` and the manifests of all workspace packages (including `services/backup/package.json`, so the frozen lockfile still matches the workspace), run `pnpm install --frozen-lockfile --filter @homeserver/${SERVICE}...`, then copy `services/${SERVICE}` and build. The layer cache behaves like the separate `deps` stage (install reruns only when manifests change) and the `COPY --from=deps` lines disappear. Alternative: keep `deps` + `builder`; rejected, the split only existed to move `node_modules` between stages. `libc6-compat` is dropped if both builds and starts pass without it.

**Revision args for both application images.** The four `ARG`/`ENV` lines are in the shared file, so Wichteln gets them too. This removes the `revision-build-args` matrix switch and the conditional step in `ci.yml`. They sit in the runtime stage after all expensive layers so changing them never invalidates the build cache.

**Empty `services/wichteln/public/`.** Keeps the Dockerfile free of conditionals; a `.gitkeep` makes git track the folder.

**Backup as `services/backup`, own Dockerfile.** `git mv infrastructure/db-backup services/backup`, add `package.json` (`@homeserver/backup`, private, `lint`, `lint:ci`, `test` = `node --test`; no `build` or `clean` script, so `pnpm -r build` skips it) and add the package to `pnpm-workspace.yaml`. The package has no runtime dependencies, so its Dockerfile needs no pnpm: `FROM node:<exact tag>`, `apk add --no-cache postgresql16-client` (with the existing comment about keeping the major in step with the `postgres` image), `COPY` of the five scripts to `/usr/local/bin` and `chmod`, the entrypoint. It is built with `services/backup` as the build context. Script paths inside the container stay `/usr/local/bin/...`, so the restore and token commands in the READMEs and `CLAUDE.md` do not change. Alternatives considered: mounting the scripts into a stock image (still needs a Dockerfile for the client, and keeps the code outside pnpm/CI); porting the scripts to shell with `curl`/`jq` or replacing the upload with rclone (a rewrite of tested OAuth and upload logic with no behaviour gain; the user chose to keep Node.js).

**Backup tests with `node --test`.** The restore script is destructive, so its decision logic is unit-tested: argument parsing, connection resolution (dev default, missing prod string), the refusal to restore a non-prod target into the production connection, and backup-file resolution. Tests live in `services/backup/test/` and use only `node:test` and `node:assert`, so the package stays free of dependencies. The `main` entry guard in `restore-backup.mjs` stays and the helpers are exported. The upload and token scripts are HTTP against Microsoft and stay manually verified.

**Published backup image, pulled by compose.** `ci.yml` builds `homeserver-backup` like the other images (context `services/backup`, `file: services/backup/Dockerfile`), the deploy waits for all four, and compose uses `ghcr.io/<owner>/homeserver-backup:latest` without a `build:` section. The server no longer needs a build toolchain for the stack. Alternative: keep building on the host; rejected because it is the only image that does not follow the publish-then-pull flow and would not be covered by change detection.

**Pipelines and change detection.** `detect-changes.mjs` adds `backup` to `SERVICES` (so `services/backup/**` and the shared workspace files flag it) and a small set of "application image" files (`Dockerfile`) that flags `web` and `wichteln` only: adding it to the shared workspace files would also rebuild the dev machine and the backup, which do not use it. `pull-request.yml` gets a `backup` output, a `test-backup` job (`pnpm --filter @homeserver/backup test`), a stack-start build of the backup image when it changed, and `test-backup` in the quality gate's `needs`. `ci.yml`'s matrix gains per-entry `file`, `context` and `build-args` fields.

## Risks / Trade-offs

- [Shared Dockerfile change affects both services] → change detection rebuilds both in the pull request and the stack start proves they run.
- [`pnpm install --filter` with an extra workspace package resolves differently from the full install] → verify with `docker build` of both services and a container start before the diff is reviewed; the backup manifest is copied so the lockfile stays consistent.
- [A new first-time image `homeserver-backup` must exist in GHCR before the deploy pulls it] → the same CI run publishes it before the deploy job, and the GHCR package must allow the deploy host to pull it like the other images.
- [Moving the folder renames paths in documentation, Renovate comment and compose] → covered by tasks; `grep -rn db-backup` must return nothing outside archived changes.
- [Linting reformats the existing backup scripts] → the first `pnpm lint` run reformats them; the diff is reviewed once with the rest.

## Migration Plan

Merge: the "CI" pipeline publishes the four images, rsyncs `infrastructure/` and recreates the stack; the backup container is then started from the pulled image. The old `./backup` data directory on the host and its volume mapping are unchanged. Rollback: revert the commit; the previous Dockerfiles and the compose file with the host build return together.
