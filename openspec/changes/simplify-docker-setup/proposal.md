# Proposal

## Why

`services/web/Dockerfile` and `services/wichteln/Dockerfile` are near copies: both are the standard Next.js standalone build for a pnpm workspace package and differ only in the service name, `public/` and the revision build arguments. Every base-image bump, pnpm change or build fix has to be made twice. The backup image's Dockerfile copies five scripts into the image, so a script change needs an image rebuild although the scripts are plain files.

## What Changes

- Replace `services/web/Dockerfile` and `services/wichteln/Dockerfile` with one `Dockerfile` at the repository root, parameterised by a `SERVICE` build argument (`web` or `wichteln`). It uses a single build stage (manifests, `pnpm install --frozen-lockfile`, sources, build) and one runtime stage.
- Give both application images the revision build arguments (commit, branch, run id, build time), so the pipelines no longer special-case the web application.
- Add an empty `services/wichteln/public/` so the shared Dockerfile copies `public/` for both services.
- Point `ci.yml` and `pull-request.yml` at the shared Dockerfile with `SERVICE=<name>` and drop the `revision-build-args` matrix switch.
- Make change detection treat the root `Dockerfile` as an input of the web application and Wichteln (not of the development machine or the infrastructure).
- Shrink `infrastructure/db-backup/Dockerfile` to the base image plus the PostgreSQL client: the scripts are mounted read-only into the container instead of copied, so a script change needs a container recreate, not an image rebuild.
- Keep `services/dev-machine/Dockerfile` unchanged.

There is no way to drop the backup Dockerfile completely: the scripts need Node.js and `pg_dump`, and no official image ships both (see design.md).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pipeline`: the CI pipeline builds web and Wichteln from one shared Dockerfile and tags both with their revision; change detection maps the shared Dockerfile to both; the Renovate Dockerfile coverage names the new locations.

## Impact

- Files: `Dockerfile` (new), `services/web/Dockerfile` and `services/wichteln/Dockerfile` (removed), `services/wichteln/public/.gitkeep` (new), `infrastructure/db-backup/Dockerfile`, `infrastructure/docker-compose.yml` (backup service mount and entrypoint), `infrastructure/db-backup/*.sh|*.mjs` (script paths and executable bit), `infrastructure/README.md`, `README.md`, `.github/workflows/ci.yml`, `.github/workflows/pull-request.yml`, `.github/scripts/detect-changes.mjs` and its test.
- The published image names and tags, the runtime behaviour and the backup behaviour do not change. The restore and token commands change their script path.
