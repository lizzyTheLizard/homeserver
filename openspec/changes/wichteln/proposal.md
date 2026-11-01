# Proposal

> **Issue:** none. The request arrived as `/openspec-propose` with `wichteln.zip`; on the user's
> instruction this work lives on branch `wichteln` as change `wichteln`, so the repo's
> `issue-<n>-<slug>` triple is not satisfied. Scope is derived from the request itself.

## Why

`wichteln.zip` is a complete, self-contained Next.js app for anonymous Secret-Santa groups, but it
exists only as an upload: it is not part of the workspace, it is not built or deployed by the
pipeline, it has no hostname, and it stores all state in `data/db.json` on the container's
filesystem — so every redeploy silently loses every group, wish and selection. We want it running
as its own service at `https://wichteln.gutschi.site`, deployed from this repository like the other
apps, with its data in PostgreSQL.

## What Changes

- **Add the app as its own workspace package.** Extract the uploaded archive into `wichteln/` as
  `@homeserver/wichteln`, add it to `pnpm-workspace.yaml`, and adapt its package metadata, linting
  and test setup to the repository conventions. No behavior of the app itself changes.
- **Replace the JSON store with PostgreSQL.** Introduce a relational schema (`wichteln_groups`,
  `wichteln_users`) with versioned SQL migrations that run at startup, a connection pool, and
  transactional group mutations that serialize concurrent wish/selection writes. The whole
  read-modify-write-through-a-lock model in `lib/store.ts` is replaced; the matching algorithm
  keeps its behavior.
- **Move configuration out of the filesystem.** `SESSION_SECRET` replaces the generated
  `data/.secret` file, and `ADMIN_USER`/`ADMIN_PASSWORD` are required deployment environment
  variables. The app writes nothing to disk.
- **Deploy as a single app.** Add `wichteln/Dockerfile` (Next.js standalone output) producing
  `homeserver-wichteln:latest`, and a `wichteln` service in the compose stack with a health
  endpoint and no published ports.
- **Add the database to the infrastructure.** Add a dedicated `postgreswichteln` service
  (`postgres:16-alpine`, database/user `wichteln`) with its own named volume
  `postgres_wichteln_data`. It is not exposed outside the stack and is separate from the
  homeserver database.
- **Publish the hostname.** Add `wichteln.gutschi.site` to the authoritative zone (record, serial
  bump), add it to the plain-HTTP server, and add an nginx TLS server block proxying to the
  `wichteln` service. Add the hostname to the certificate bootstrap and smoke-test certificate
  generation.
- **Wire it into the pipeline.** Add a `build-wichteln` image job (GHA cache scope
  `homeserver-wichteln`) and a `test-wichteln` job, make the smoke suite and deploy load/run the
  new image, add the new hostname to the smoke `/etc/hosts` and checks, and include the build job
  in `all-build-checks`.
- **Update the specs and docs.** New `wichteln` capability; `infrastructure` and `pipeline` deltas;
  `infrastructure/README.md`, `infrastructure/env.example`, `integration-test/env.test`,
  `README.md` and `AGENTS.md` document the service, hostname and required secrets.
- **BREAKING** (deployment configuration): the stack now requires `WICHTELN_DB_PASSWORD`,
  `WICHTELN_SESSION_SECRET` and `WICHTELN_ADMIN_PASSWORD`; without them the `wichteln` service and
  its database fail closed at startup.
- **Out of scope:** migrating the upload's `data/db.json` (there is no deployed instance to
  migrate), and backing up/restoring the new database. The existing backup service still covers
  only `postgresprod`; a follow-up issue should extend it to `postgreswichteln`.

## Capabilities

### New Capabilities

- `wichteln`: the standalone Wichteln app — admin group creation and participant credentials,
  participant login and the wish phase, the admin-triggered selection phase, the fair matching that
  never leaves a participant with their own wish, and the PostgreSQL-backed persistence that
  replaces the JSON file.

### Modified Capabilities

- `infrastructure`: the stack gains a Wichteln service and its own database, the image set gains
  `homeserver-wichteln:latest`, the named-volume set gains the Wichteln database volume, the
  published hostname set gains `wichteln.gutschi.site`, and the reverse proxy routes it.
- `pipeline`: the pipeline gains a Wichteln test job and image build, the smoke suite gains a
  Wichteln hostname check and loads the new image, and the deploy ships it.

## Impact

- `wichteln/` — new workspace package: `app/` (pages, server actions, components), `lib/`
  (matching, session, new DB/store layer), `db/001_init.sql`, `Dockerfile`, `package.json`,
  `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`, tests.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml` — new package and its dependencies.
- `infrastructure/docker-compose.yml` — `wichteln` and `postgreswichteln` services, nginx
  dependency, volume.
- `infrastructure/nginx/nginx.conf`, `infrastructure/nginx/nginx-bootstrap.conf` — hostname in the
  HTTP server and a new TLS server block.
- `infrastructure/bind9/db.gutschi.site` — `wichteln` A record and serial bump.
- `infrastructure/env.example`, `integration-test/env.test`, `infrastructure/.env` — new secrets
  and credentials.
- `.github/workflows/homeserver.yml` — `test-wichteln`, `build-wichteln`, artifact handling in
  `integration-smoke`, `all-build-checks` and `deploy`.
- `integration-test/scripts/generate-certs.sh`, `integration-test/src/infra.tests.ts`,
  `integration-test/src/stack.ts` — certificate SANs, hostname and smoke check.
- `infrastructure/README.md`, `README.md`, `AGENTS.md` — deployment and development documentation.
- `openspec/specs/wichteln/`, `openspec/specs/infrastructure/`, `openspec/specs/pipeline/` — spec
  updates.
