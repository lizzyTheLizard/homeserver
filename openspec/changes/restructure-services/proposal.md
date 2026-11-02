# Proposal

## Why

The five deployable services (`web`, `assistant`, `whatsapp-bridge`, `wichteln`, `dev-machine`) sit as loose top-level folders alongside the shared root `db/`, and a single `homeserver.yml` builds all five images and deploys them together. As the stack grows, this makes it hard to see which folder is a deployable service, to reason about each service's own image and database, and to deploy one service independently of the others. We want each service to be a first-class, self-contained unit under one `services/` folder, with its own image name and its own pipeline that builds and deploys it only when it changes.

## What Changes

- Introduce a top-level `services/` folder and move the five deployable services into it: `web/`, `assistant/`, `whatsapp-bridge/` (renamed to `whatsapp/`), `wichteln/`, and `dev-machine/`.
- Rename the WhatsApp bridge folder, workspace package and capability from `whatsapp-bridge` to `whatsapp`, while keeping the companion's runtime behaviour unchanged.
- Standardise every service's image on one name per service — `homeserver-web`, `homeserver-assistant`, `homeserver-whatsapp`, `homeserver-wichteln`, `homeserver-dev-machine` — published to GitHub Container Registry (GHCR) as `ghcr.io/<owner>/<name>:latest`, replacing the current mixed, locally loaded names (`homeserver`, `homeserver-assistant`, `whatsapp-bridge`, `homeserver-wichteln`, `homeserver-dev-machine`). **BREAKING** for any tooling or documentation that references the old image names.
- Split the single pipeline into one GitHub workflow per service, each triggered by a path filter on its own `services/<name>/` folder, so a service is only built and deployed when it changes. Each builds and publishes its image to GHCR and then deploys it; unchanged services reuse their latest GHCR image. Shared jobs (change guard, lint, the stack smoke suite) stay in a common workflow, which pulls the latest images from GHCR.
- Move the repository-root `db/` folder (the web application's migrations) into `services/web/db/`, mirroring how `wichteln` already keeps its own `db/` beside its app.
- Remove the `microsoft_token` migration from the web application's migrations; it is not used by web.
- Give the assistant its own migration files and a table-name-prefixed schema (`assistant_*`) in the shared database, carrying its own Microsoft token table (the old token data is not migrated and may be deleted). **BREAKING** for the assistant's existing `microsoft_token` table, which is replaced by a prefixed table.
- Give wichteln a table-name prefix (`wichteln_*`) in the shared database instead of its separate database, and move its tables into the shared homeserver database; existing data is not migrated and may be deleted. **BREAKING** for wichteln's existing separate database.

## Capabilities

### New Capabilities

None. The services' behaviours are already covered by the existing capabilities; this change reorganises where they live and how they are built and deployed.

### Modified Capabilities

- `pipeline`: the image names, the per-service workflow split, the path-filtered build-and-deploy behaviour, and publishing images to GHCR instead of uploading build artifacts.
- `infrastructure`: the `services/` layout, the standardised GHCR image names (pulled, not locally loaded), and the shared-database organisation with table-name prefixes for the assistant and wichteln.
- `whatsapp-bridge`: the capability is renamed to `whatsapp` (folder, package and image), with no change to the bridge's runtime behaviour.
- `assistant`: the assistant owns its own prefixed schema and migration files, and stores its Microsoft token in a prefixed table it migrates itself.

## Impact

- **Repository layout**: `web/`, `assistant/`, `whatsapp-bridge/`, `wichteln/`, `dev-machine/` and the root `db/` all move under `services/`; `whatsapp-bridge` becomes `services/whatsapp`.
- **Workspace / tooling**: `pnpm-workspace.yaml` package paths, the `@homeserver/*` package names, the root `package.json` scripts (`dev:*`, `test`, etc.), and every Dockerfile/`docker-compose` build path must follow the new layout and image names.
- **CI**: `.github/workflows/` splits into per-service workflows (path-filtered) plus a shared workflow; each per-service workflow publishes to GHCR and deploys; `scripts/`, the `setup` action and the change guard must be reconciled with the new paths and the GHCR login.
- **Infrastructure**: `infrastructure/docker-compose.yml` image names change to the GHCR names (pulled at deploy time instead of `pull_policy: never`), the separate `postgreswichteln` service/database is removed, and the shared-database connection for the assistant and wichteln (with prefixes) changes.
- **Database**: web's migrations move into `services/web/db/` (minus `microsoft_token`); the assistant gains its own prefixed migrations; wichteln's tables are prefixed and moved into the shared database. Existing `microsoft_token` and wichteln data are not migrated.
- **Tests**: the integration test's in-memory database seeding, the smoke suite's image/artifact names, and the `wichteln` dev-database bootstrap must follow the new layout, names and shared database.
