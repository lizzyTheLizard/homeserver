# Proposal

## Why

`services/web/Dockerfile` and `services/wichteln/Dockerfile` are near copies: both are the standard Next.js standalone build for a pnpm workspace package and differ only in the service name, `public/` and the revision build arguments. Every base-image bump, pnpm change or build fix has to be made twice. The backup is the odd one out: a loose folder under `infrastructure/` whose scripts are neither linted nor tested, whose image is built on the server instead of published like every other image, and whose restore logic (a destructive operation on production) has no tests.

## What Changes

- Replace `services/web/Dockerfile` and `services/wichteln/Dockerfile` with one `Dockerfile` at the repository root, parameterised by a `SERVICE` build argument (`web` or `wichteln`). It uses a single build stage (manifests, `pnpm install --frozen-lockfile`, sources, build) and one runtime stage.
- Give both application images the revision build arguments (commit, branch, run id, build time), so the pipelines no longer special-case the web application.
- Add an empty `services/wichteln/public/` so the shared Dockerfile copies `public/` for both services.
- Promote the backup from `infrastructure/db-backup/` to its own service `services/backup`: a pnpm workspace package `@homeserver/backup` with `lint`, `lint:ci` and `test` scripts, its own small `Dockerfile` (Node.js and the PostgreSQL client, scripts copied in) and unit tests for the restore logic. The scripts stay plain Node.js `.mjs` and shell; no TypeScript conversion.
- Publish the backup image to GHCR as `homeserver-backup:latest` like the other images; compose pulls it instead of building it on the host.
- Treat the backup as a fourth service in `ci.yml`, `pull-request.yml` (change detection, test job, stack-start build, quality gate) and `detect-changes.mjs`. A change to the root `Dockerfile` marks only the web application and Wichteln as changed.
- Move the backup requirements out of the `infrastructure` spec into a new `backup` spec.
- Keep `services/dev-machine` unchanged.

## Capabilities

### New Capabilities

- `backup`: the nightly production dump, its OneDrive upload and the restore into the dev or prod database, moved unchanged from `infrastructure`, plus the requirement that the backup is built, linted, tested and published like the other services.

### Modified Capabilities

- `pipeline`: the CI pipeline builds web and Wichteln from one shared Dockerfile and the backup from its own, publishes and deploys four images and tags web and Wichteln with their revision; change detection knows the backup and maps the shared Dockerfile to web and Wichteln; the backup has a test job; the Renovate Dockerfile coverage names the new locations.
- `infrastructure`: the backup requirements move out; the backup image is pulled from GHCR instead of built on the host.

## Impact

- Files: `Dockerfile` (new), `services/web/Dockerfile` and `services/wichteln/Dockerfile` (removed), `services/wichteln/public/.gitkeep` (new), `infrastructure/db-backup/` moved to `services/backup/` (with new `package.json`, `Dockerfile`, tests), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `infrastructure/docker-compose.yml` (backup uses the published image), `.github/workflows/ci.yml`, `.github/workflows/pull-request.yml`, `.github/scripts/detect-changes.mjs` and its test, `.github/renovate.json5` (path in a comment), `infrastructure/README.md`, `README.md`, `CLAUDE.md`, `openspec/specs/README.md`.
- Image names of web, Wichteln and the dev machine do not change; a new image `homeserver-backup` appears. The runtime and backup behaviour and the script paths inside the container (`/usr/local/bin/...`) do not change, so the documented restore and token commands stay the same.
