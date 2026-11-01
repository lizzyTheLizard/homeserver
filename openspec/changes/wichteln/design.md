# Design

## Context

`wichteln.zip` is a single-package Next.js 16 App Router app (App Router pages, server actions,
one CSS file) whose entire state lives in `data/db.json`. Its `lib/store.ts` serialises writes with
an in-process Promise lock and rewrites the whole file atomically; `lib/session.ts` keeps the cookie
signing secret in `data/.secret`; admin credentials come from `ADMIN_USER`/`ADMIN_PASSWORD`.

The repository is a pnpm workspace (`web`, `assistant`, `whatsapp-bridge`, `integration-test`) with
one `infrastructure/docker-compose.yml`, nginx + certbot + bind9, images built in CI and loaded on
the host, and a Next.js standalone image for `web`. Tests are Vitest; database tests use PGlite with
the real migrations.

Constraints that shape the approach:

- The app must become a separate deployable unit ("single app"), not a route inside `web`.
- The deployment must fit the existing pipeline, which builds one image per app and ships it as a
  tar artifact consumed by the smoke suite and the deploy job.
- The deployment already runs on the host; there is no cloud terraform, no managed database.
- No GitHub issue exists for this work: the user asked for branch `wichteln` and change `wichteln`
  directly, so the repo's `issue-<n>-<slug>` triple is deliberately not satisfied.
- nginx loads every referenced certificate at startup. A new TLS server block whose certificate does
  not exist yet would prevent nginx from starting and take the whole site down (see Risks).

## Goals / Non-Goals

**Goals:**

- One `@homeserver/wichteln` package with its own image, container, hostname, database and CI jobs.
- A PostgreSQL schema and store layer that preserve the current matching behavior and survive
  redeploys.
- A deployment that fails closed when its secrets are missing, without a single node of the app's
  state or configuration living on a writable filesystem.
- Tests that prove the matching logic and the SQL store against the real schema.

**Non-Goals:**

- No UI redesign, no new features, no changes to the matching algorithm.
- No data migration from the uploaded JSON file: it was never deployed.
- No backup/restore support for the new database in this change (follow-up issue).
- No shared auth with the homeserver web app; Wichteln keeps its own participant/admin sign-in.

## Decisions

### 1. Workspace package at `wichteln/`, image `homeserver-wichteln:latest`

Add `wichteln` to `pnpm-workspace.yaml` as `@homeserver/wichteln`, copying the archive's `app/` and
`lib/` unchanged in structure. Build it with its own `wichteln/Dockerfile` modelled on
`web/Dockerfile`: a deps stage that installs the workspace with the frozen lockfile, a builder stage
running `pnpm --filter @homeserver/wichteln build`, and a runner stage that copies the standalone
output, static assets and `wichteln/db/` migrations, then runs as a non-root user.

*Alternative considered:* merging the routes into `web`. Rejected — it couples two release cycles,
shares the homeserver session/auth model, and contradicts the request for a standalone app.

*Alternative considered:* a plain React SPA plus API. Rejected — the upload is already a working
Next.js app with server actions; rewriting it adds risk without benefit.

### 2. Dedicated `postgreswichteln` service, not a second database on `postgresprod`

Add a `postgres:16-alpine` service `postgreswichteln` (user/database `wichteln`, password from
`WICHTELN_DB_PASSWORD`) with the named volume `postgres_wichteln_data`, not published.

*Why:* the existing `postgresprod` volume is already initialised, so a new database created through
`docker-entrypoint-initdb.d` would never run on the deployed volume; creating it manually would make
the deployment depend on an undocumented one-off step. A separate server also keeps Wichteln's
schema, migrations and lifecycle independent from the homeserver app, and lets the app own its
database migrations without touching `db/`.

*Alternatives considered:* a `wichteln` database inside `postgresprod` (shares blast radius and
migration ownership, manual bootstrap on existing volumes); a schema inside the homeserver database
(same coupling); SQLite (the original problem: state on a container filesystem).

### 3. Normalised schema, not a JSONB document

`wichteln/db/001_init.sql` creates `wichteln_groups` (`id`, `name`, `phase`, `created_at`) and
`wichteln_users` (`id`, `group_id`, `name`, `password`, `wish_title`, `wish_description`,
`selected_wish_of`, `created_at`), with:

- `phase` constrained to `wishes`/`selection`;
- a unique index on `(group_id, lower(name))` so participant names stay unique per group;
- a check that a wish has both title and description or neither;
- `ON DELETE CASCADE` from group to participants and `ON DELETE SET NULL` for `selected_wish_of`;
- a unique index on `(group_id, selected_wish_of)` where not null, preventing two participants from
  selecting the same participant's wish at the database level.

*Why:* foreign keys, uniqueness and concurrency become the database's job instead of an in-process
lock, and the admin/selection reads become simple queries. A JSONB blob would keep the current
whole-document write model and give up referential integrity.

*Trade-off:* the actions are rewritten from object mutation to queries rather than a mechanical port.

### 4. Minimal `pg` layer with startup migrations and a test seam

- `lib/db.ts` owns a `globalThis`-cached `pg.Pool` built from `DB_CONNECTION_STRING`, runs the
  `db/*.sql` migrations once per process under a PostgreSQL advisory lock (so concurrent workers
  cannot race), and exposes `withTransaction(fn)` (BEGIN/COMMIT/ROLLBACK) plus a read helper.
- The migration runner lives in `wichteln/lib/migrate.ts`; it is a trimmed version of the web
  runner: ordered `.sql` files, SHA-256 hashes in a `migrations` table, abort on a changed or missing
  applied migration. It is intentionally not imported across packages.
- `lib/store.ts` exposes query functions (`listGroups`, `getGroup`, `findUser`, `createGroup`,
  `addParticipants`, `removeParticipant`, `saveWish`, `startSelection`, `deleteGroup`,
  `selectWish`) that operate on a `Queryable` interface (`{ query(sql, params) }`). `pg.Pool` and
  `PoolClient` satisfy it; tests pass a thin PGlite adapter. Pages call the read functions, actions
  call `withTransaction`.

*Alternative considered:* reusing `web/app/shared/_external/db/migrate.ts` via a relative import.
Rejected — it reaches into another package's internals and pulls web-specific logging/error types.

### 5. Serialise mutations per group with `SELECT ... FOR UPDATE`

Every mutating store function locks the group row (`SELECT id FROM wichteln_groups WHERE id = $1
FOR UPDATE`) inside its transaction before reading participants, validating and writing. Reads run
without a lock. `selectWish` computes `selectableWishOwners` on the locked snapshot and updates in
the same transaction.

*Why:* the fairness rule depends on the full set of selections; a stale snapshot could strand a
participant with their own wish. Per-group locking serialises only the affected group; the web app's
in-process lock disappeared with the JSON store.

*Alternatives considered:* `SERIALIZABLE` isolation with retry (more code and retry loops for the
same guarantee); a global advisory lock (unnecessary contention across groups).

### 6. Configuration from the environment, fail closed

`lib/config.ts` reads `DB_CONNECTION_STRING`, `SESSION_SECRET`, `ADMIN_USER` and `ADMIN_PASSWORD`
lazily and throws a descriptive error if any is missing; `ADMIN_USER` also has no default. The
session cookie format (base64url JSON + HMAC-SHA256) is unchanged, but the secret comes only from
`SESSION_SECRET`. `app/api/health/route.ts` (Node runtime) returns 200 only when configuration
validates and `SELECT 1` succeeds, and 503 otherwise; it performs no authentication and exposes no
data.

*Why:* the previous app generated `data/.secret` on first use, which is lost on redeploy (all
sessions break) and is a writable-state dependency. Failing closed matches the repository's existing
`env.test`/`env.example` secret handling.

*Trade-off:* participant passwords stay stored in plaintext because the admin must be able to read
and distribute them; hashing would break that flow. The database is not published, and the
comparison stays inside the app. This is unchanged behavior, now documented.

### 7. Compose service with no published port and a soft dependency for nginx

```yaml
wichteln:
  image: homeserver-wichteln:latest
  pull_policy: never
  restart: unless-stopped
  environment:
    NODE_ENV: production
    PORT: 3000
    DB_CONNECTION_STRING: postgres://wichteln:${WICHTELN_DB_PASSWORD}@postgreswichteln:5432/wichteln?sslmode=disable
    SESSION_SECRET: ${WICHTELN_SESSION_SECRET}
    ADMIN_USER: ${WICHTELN_ADMIN_USER}
    ADMIN_PASSWORD: ${WICHTELN_ADMIN_PASSWORD}
  depends_on:
    postgreswichteln: { condition: service_healthy }
  healthcheck: node -e "fetch('http://127.0.0.1:3000/api/health')…"
```

nginx gains `depends_on: wichteln: { condition: service_started }` rather than `service_healthy`.
The other apps gate nginx on health because nginx resolves their names at startup; `service_started`
is enough for name resolution and avoids a Wichteln outage preventing the whole site from serving.

### 8. Hostname: DNS, nginx, and a separate certificate

- `infrastructure/bind9/db.gutschi.site`: `wichteln IN A __HOST_IP__`, serial bumped.
- `nginx/nginx.conf`: add `wichteln.gutschi.site` to the port-80 `server_name` list and add a 443
  server block for it, mirroring the `www` block (proxy headers, upgrade handling) with
  `proxy_pass http://wichteln:3000;`.
- `nginx/nginx-bootstrap.conf`: same hostname added to the HTTP server so ACME works before the TLS
  block exists.
- Certificate: a **separate** Let's Encrypt lineage at
  `/etc/letsencrypt/live/wichteln.gutschi.site/`. Bootstrap: `certbot certonly --webroot -w
  /var/www/certbot -d wichteln.gutschi.site` while the running nginx serves the challenge (the port
  80 server is the default server, so it answers for the new name even before the config update).
  Document it in `infrastructure/README.md` and add the name to the smoke cert helper.
- `integration-test/scripts/generate-certs.sh`: add the domain to the SAN list and the generated
  directory list; add the hostname to the CI `/etc/hosts` block and `stack.ts`.

*Alternative considered:* adding the name to the existing `www.gutschi.site` certificate. Rejected —
  it forces a reissue of a live certificate and couples unrelated hostnames.

### 9. Pipeline: one test job, one build job, artifact through smoke and deploy

- `test-wichteln`: `pnpm test` in `wichteln/` after the shared setup action.
- `build-wichteln`: same shape as `build-app`, context `.`, `file: wichteln/Dockerfile`, tag
  `homeserver-wichteln:latest`, GHA cache scope `homeserver-wichteln`, tar artifact
  `homeserver-wichteln`.
- `integration-smoke`: add `build-wichteln` to `needs`, download/load the tar, add the hostname to
  `/etc/hosts`.
- `all-build-checks`: add `test-wichteln` and `build-wichteln`.
- `deploy`: download/load the tar, rsync it, remove it after loading.

The smoke suite checks `https://wichteln.gutschi.site/` through nginx (any of 200/301/302/307/308,
like the app root check) and the Wichteln container health.

### 10. Tests without a running PostgreSQL

`wichteln/vitest.config.mts` runs a single Node-environment project:

- `lib/matching.tests.ts` — pure matching unit tests (own wish excluded, taken wishes excluded,
  unsafe choices excluded, complete assignment possible).
- `lib/store.tests.ts` — integration tests that build a PGlite instance, apply `wichteln/db/*.sql`
  through the same migration runner, adapt it to the `Queryable` interface, and exercise create,
  add/remove, wish save, phase start, selection and the concurrent-selection guard.

Linting uses a trimmed copy of `web/eslint.config.mjs` (no Storybook plugins) so `pnpm lint:ci`
covers the package.

## Risks / Trade-offs

- **The first deploy can break nginx for the whole site.** nginx validates the Wichteln certificate
  at startup; if the config ships before the certificate exists, nginx does not start. → Make
  "issue the certificate, add `WICHTELN_*` secrets" an explicit pre-merge runbook step, and keep the
  bootstrap command in `infrastructure/README.md`. The deploy's health wait will fail loudly rather
  than silently.
- **No backup for the new database.** A lost `postgres_wichteln_data` volume loses all groups. →
  Explicitly out of scope in the proposal; create a follow-up issue to extend the backup/restore
  service. Until then the volume is the only copy.
- **New mandatory secrets make the deploy fail closed.** → Add them to `infrastructure/env.example`,
  `integration-test/env.test` and the README, and keep the failure message explicit.
- **The app's Next version (16.4.3) differs from `web` (^16.3.6).** pnpm may keep two versions. →
  Acceptable; the package is independent. If the lockfile resolves a single version, no action.
- **Lockfile churn from a new workspace package.** → Regenerate with `pnpm install` in the same
  commit as the package, and never hand-edit `pnpm-lock.yaml`.
- **Plaintext participant passwords.** → Same as the original app; the database is not published.
  Documented rather than changed, because the admin distribution flow depends on readable passwords.
- **Session cookie compatibility is not preserved.** Changing the secret source invalidates any
  existing cookie. → There is no deployed instance, so nothing to migrate.
- **Matching is a per-request bipartite matching over all participants.** → Groups are small; the
  algorithm is unchanged. The per-group row lock bounds concurrent work.

## Migration Plan

1. Add the `WICHTELN_*` secrets to `/opt/homeserver/.env` and deploy the bind9 record (rsync +
   restart of `bind9`) so `wichteln.gutschi.site` resolves to the host.
2. Issue the certificate once, from `infrastructure/` while nginx still serves ACME:
   `docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot -d wichteln.gutschi.site`
   (or restart certbot after adding the lineage). Verify `certbot/conf/live/wichteln.gutschi.site/`.
3. Merge the change. The pipeline builds `homeserver-wichteln`, the smoke suite boots the full stack
   with self-signed certificates, and the deploy rsyncs the compose/nginx/DNS changes and the image,
   then recreates the stack. `postgreswichteln` initialises on first start and the app applies
   `001_init.sql`.
4. Rollback: revert the commit and redeploy; the `wichteln` service/volume and certificate are
   harmless if unused. Dropping the volume is a deliberate, separate action (no backup exists).

## Open Questions

- None that change the approach. The GitHub issue number and the backup/restore follow-up are
  tracked in the proposal and Risks.
