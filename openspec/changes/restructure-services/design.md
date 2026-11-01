# Design

## Context

Today the five deployable services (`web`, `assistant`, `whatsapp-bridge`, `wichteln`, `dev-machine`) are loose top-level folders, the web application's migrations live in a repository-root `db/`, and a single `homeserver.yml` builds all five images (under mixed names) and deploys them together. `wichteln`'s code is merged but its OpenSpec change is still in-flight, so its capability is not yet in `openspec/specs/`. The assistant is the only service that reads or writes the `microsoft_token` table; the web application never touches it. See `proposal.md` for the motivation.

## Goals / Non-Goals

**Goals:**

- Give each service one unambiguous home under `services/<name>/` with a single `homeserver:<name>` image and a self-contained build path.
- Let each service build and deploy independently, triggered only by changes under its own folder.
- Give each service that persists data its own, prefixed slice of the shared database (web keeps its migrations minus the token; the assistant owns its prefixed token table; wichteln keeps its already-prefixed tables but in the shared database).

**Non-Goals:**

- No behavioural changes to any service's runtime (the rename and moves are layout/build/packaging only).
- No data migration: the old `microsoft_token` rows and the old Wichteln database contents are dropped, not migrated.
- No change to how the services authenticate, serve requests, or talk to each other over the network.

## Decisions

### 1. One `services/` folder holding every deployable

Move `web`, `assistant`, `whatsapp-bridge` (→ `whatsapp`), `wichteln` and `dev-machine` under a new top-level `services/`. The integration-test package stays at the repository root (it is not a deployable service). This gives a single, scanable place for "things that ship as a container".

- **Rationale:** a deployable service is now distinguishable at a glance from shared tooling, and each service's Dockerfile, migrations and package sit together.
- **Alternatives:** a `packages/` monorepo layout, or keeping flat folders — rejected because the request explicitly wants a `services/` folder and a clear service boundary.

### 2. Standardise images on one name per service, published to GHCR

Replace `homeserver` (web), `homeserver-assistant`, `whatsapp-bridge`, `homeserver-wichteln` and `homeserver-dev-machine` with one flat image name per service — `homeserver-web`, `homeserver-assistant`, `homeserver-whatsapp`, `homeserver-wichteln`, `homeserver-dev-machine` — published to GitHub Container Registry as `ghcr.io/<owner>/<name>:latest`. The `services/<name>/` folder, the `@homeserver/<name>` package and the `<name>` image all share the same `<name>`.

- **Rationale:** one name per service across folder, package and image, removing the current ad-hoc mix; GHCR gives a single source of truth so an unchanged service reuses its latest published image instead of being rebuilt.
- **Alternatives:** keep the no-registry "built and loaded, never pulled" model — rejected in favour of GHCR so that the smoke suite and deploy can always obtain all five images even when only one service changed.

### 3. Split the pipeline into per-service workflows plus a shared workflow

Replace the single `homeserver.yml` with one path-filtered workflow per service (`services/<name>/**`) that builds, publishes to GHCR and deploys only that service's image, and a shared workflow for the cross-cutting jobs (change guard, lint, the stack smoke suite, the aggregated check). Each per-service workflow publishes its image to GHCR and then triggers/refreshes its own container on the host; unchanged services keep their latest GHCR image. The shared smoke suite pulls the latest images from GHCR, so it can run on every push without rebuilding unchanged services.

- **Rationale:** a change to one service must not rebuild or redeploy the others, a service's pipeline is reviewable in isolation, and GHCR removes the need to rebuild all images for the smoke suite.
- **Alternatives:** a single workflow with per-job `paths:` filters, or having the smoke suite rebuild all images itself — rejected because the user asked for separate pipelines per service and a registry to reuse the latest image.

### 4. The web application keeps the repository's migrations (minus the token)

Move `db/` into `services/web/db/`, matching how `wichteln` already keeps its own `db/` beside its app. Delete `110_microsoft.sql` (the `microsoft_token` table) from it, because the web application never reads or writes that table. The web `Dockerfile`'s `COPY ./db ./db` becomes `COPY ./services/web/db ./db` (or the equivalent), and the migration directory resolution in `app/shared/_external/db/migrate.ts` is updated to the new location.

- **Rationale:** the token table is assistant-owned (see decision 5), so it must not be created by the web application's migrations.
- **Alternatives:** leave `db/` at the root — rejected, because the request moves `db/` into `web/` to mirror wichteln.

### 5. The assistant owns its token table under an `assistant_` prefix

The assistant gains its own `services/assistant/db/` migration directory (a new migration that creates `assistant_microsoft_token`), its own migration runner (it currently has only a `transactional` pool helper and no migrate step), and its `microsoft/data.ts` is updated to read and write `assistant_microsoft_token`. Its `DB_CONNECTION_STRING` continues to point at the shared homeserver database. The old `microsoft_token` table is no longer created anywhere; existing rows are dropped.

- **Rationale:** the assistant is the sole consumer of the token, so it owns the table and its schema, with a prefix that prevents any collision with the web application's tables in the shared database.
- **Alternatives:** keep the token in the web application's migrations — rejected (the request removes it from web because web does not use it).

### 6. Wichteln moves into the shared database (its tables are already prefixed)

Wichteln's tables are already named `wichteln_*`, so no table rename is needed. The change is to point its `DB_CONNECTION_STRING` at the shared homeserver database (rather than `postgreswichteln`), remove the `postgreswichteln` service/database and its named volume from `docker-compose.yml`, and drop the old Wichteln data. The assistant and Wichteln therefore share the homeserver database, each isolated by its table-name prefix (`assistant_*`, `wichteln_*`).

- **Rationale:** the request wants assistant and wichteln on "the same database in prod and dev … with a prefix", and wichteln's tables already carry the prefix, so the move is a connection-string and compose change.
- **Alternatives:** separate Postgres schemas (the `search_path` approach) — rejected, because the user explicitly chose table-name prefixes.

## Risks / Trade-offs

- [The in-flight `wichteln` change's specs still say "own database"] → Mitigation: this change supersedes that detail; when `wichteln` is eventually archived it must be reconciled with this change (or archived first, then this change updates the already-synced infrastructure/pipeline specs). Note this dependency in the PR.
- [The monolithic deploy job is being de-duplicated across five workflows] → Mitigation: extract the shared deploy mechanics into a reusable composite action so the five workflows do not drift.
- [GHCR introduces a registry and auth token] → Mitigation: the repository already has the `GITHUB_TOKEN` available in Actions; images are published under the repository's own GHCR namespace so the default token suffices, and the host authenticates to GHCR once (a read-only token in the deploy environment).
- [Data loss from dropping `microsoft_token` and Wichteln data] → Mitigation: this is intentional and stated in the specs; no migration script is written, and the old tables/volumes are simply no longer referenced.
- [Renaming `whatsapp-bridge` to `whatsapp` touches many references] → Mitigation: do the rename as one atomic task that updates the folder, package name, workspace globs, image name, compose service, nginx/Caddy references and every `@homeserver/whatsapp-bridge` import in one commit, and run the full test suite before moving on.
- [Cross-service build-path changes in Dockerfiles (`COPY ./db`, `COPY ./assistant/...`)] → Mitigation: the smoke suite rebuilds the images from the new layout, catching any missed path before deploy.

## Migration Plan

1. Land the folder restructure and image-name standardisation in one merge (pure moves + name changes; no behaviour change). The full test suite and smoke suite must stay green.
2. Land the database reorganisation (web keeps migrations minus the token, assistant gains its prefixed token table, wichteln moves into the shared database) as a follow-up set of tasks in the same change.
3. Switch image delivery to GHCR: per-service workflows publish `ghcr.io/<owner>/homeserver-<name>:latest`, and the stack pulls those images at deploy time.
4. On deploy, the compose stack recreates the services against the shared database; the old `postgreswichteln` volume and any leftover `microsoft_token` rows are no longer used and may be removed by hand.

**Rollback:** because no data is migrated, rolling back a task is a straight revert of that task's commit; the shared database's new prefixed tables simply become unused if the service reverts. Image delivery can roll back by restoring the old "build and load" compose configuration and workflow.

## Open Questions

None that would change the specs or the task breakdown.
