# Tasks

## 1. Package scaffold

- [x] 1.1 Create `wichteln/` from `wichteln.zip` (keep `app/`, `lib/`, `next.config.ts`, `tsconfig.json`, `README.md` and the app `.gitignore`; drop the nested `pnpm-lock.yaml`, `data/` and `.env.local.example`), rename the package to `@homeserver/wichteln`, add `wichteln` to `pnpm-workspace.yaml`, add a root `dev:wichteln` script, and regenerate `pnpm-lock.yaml`. Verify: `pnpm install --frozen-lockfile` succeeds and `pnpm --filter @homeserver/wichteln build` produces the Next.js build.

## 2. Linting and unit tests

- [x] 2.1 Add `wichteln/eslint.config.mjs` (a trimmed copy of `web/eslint.config.mjs` without the Storybook plugins), the `lint`, `lint:ci` and `clean` scripts and their dev dependencies, and fix the findings without changing behavior. Verify: `pnpm --filter @homeserver/wichteln lint:ci` exits 0 and `pnpm lint:ci` still covers the package.
- [x] 2.2 Add `wichteln/vitest.config.mts` (Node environment, `**/*.tests.ts`) and `wichteln/lib/matching.tests.ts` covering the own-wish exclusion, taken-wish exclusion, unsafe-choice exclusion and a complete assignment. Verify: `pnpm --filter @homeserver/wichteln test` passes and `pnpm --filter '!@homeserver/integration-test' test` picks the package up (the root `pnpm test` on `main` also runs the stack-dependent integration suite).

## 3. PostgreSQL persistence

- [x] 3.1 Add `wichteln/db/001_init.sql` with `wichteln_groups` and `wichteln_users` (phase check, per-group unique lower-case name, wish-completeness check, `ON DELETE CASCADE` from group, `ON DELETE SET NULL` for `selected_wish_of`, unique selected wish per group), plus `wichteln/lib/migrate.ts`, `wichteln/lib/db.ts` (pool, advisory-locked startup migrations, `withTransaction`, `Queryable`) and `wichteln/lib/config.ts` (required `DB_CONNECTION_STRING`, `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`). Add `pg`, `@types/pg`, `@electric-sql/pglite` and a migration test that applies `wichteln/db/*.sql` to PGlite. Verify: the migration test passes, `pnpm --filter @homeserver/wichteln build` still succeeds, and the app still uses its old store (no behavior change yet).
- [x] 3.2 Rewrite `wichteln/lib/store.ts` as query functions on `Queryable` (create/list/get/delete group, add/remove participant, save wish, start selection, select wish) with a `FOR UPDATE` group lock on every mutation, switch `wichteln/lib/session.ts` to `SESSION_SECRET`, rewire `app/actions.ts`, `app/admin/actions.ts`, `app/page.tsx`, `app/admin/page.tsx`, `app/admin/[groupId]/page.tsx` and `app/wunsch/page.tsx`, and delete the JSON store, `data/` handling and `.env.local.example`. Add `wichteln/lib/store.tests.ts` against PGlite for the full admin → wish → selection flow, including two racing selections. Update `wichteln/README.md` with the database setup and environment variables. Verify: `pnpm --filter @homeserver/wichteln test`, `lint:ci` and `build` pass, and a manual dev run against a `wichteln` database completes the flow.

## 4. Container image

- [x] 4.1 Set `output: "standalone"` in `wichteln/next.config.ts`, add `wichteln/app/api/health/route.ts` (200 only when configuration validates and `SELECT 1` succeeds, 503 otherwise) and add `wichteln/Dockerfile` modelled on `web/Dockerfile` (deps, builder, standalone runner as a non-root user, migrations copied to `/app/wichteln/db`, port 3000). Verify: `docker build -f wichteln/Dockerfile -t homeserver-wichteln:test .` succeeds, and the container reports healthy against a temporary PostgreSQL when given the four required variables and unhealthy when one is missing.

## 5. Infrastructure services and configuration

- [x] 5.1 Add `postgreswichteln` (`postgres:16-alpine`, user/database `wichteln`, `WICHTELN_DB_PASSWORD`, named volume `postgres_wichteln_data`, healthcheck, no published port) and `wichteln` (image `homeserver-wichteln:latest`, `pull_policy: never`, no published port, healthcheck on `/api/health`, depends on the database) to `infrastructure/docker-compose.yml`, add `wichteln: condition: service_started` to nginx's `depends_on`, add the four `WICHTELN_*` variables to `infrastructure/env.example` and `integration-test/env.test`, and document the services, the volume, the secrets and the one-off dev `createdb` in `infrastructure/README.md` and `AGENTS.md`. Verify: `docker compose --env-file integration-test/env.test -f infrastructure/docker-compose.yml config` resolves, and `docker compose up -d postgreswichteln wichteln` brings both services to healthy with the built image.

## 6. Hostname publication

- [ ] 6.1 Add `wichteln IN A __HOST_IP__` and bump the serial in `infrastructure/bind9/db.gutschi.site`; add `wichteln.gutschi.site` to the port-80 `server_name` in both nginx configs; add a 443 server block in `infrastructure/nginx/nginx.conf` proxying to `http://wichteln:3000` with the separate `live/wichteln.gutschi.site/` certificate; document the pre-deploy certificate issuance (webroot, before the config ships) in `infrastructure/README.md`; add the name to `integration-test/scripts/generate-certs.sh`. Verify: `pnpm --filter @homeserver/integration-test certs` writes the Wichteln certificate, `nginx -t` passes inside the container against the generated certs, and `dig @127.0.0.1 -p 8053 wichteln.gutschi.site` answers after the smoke stack starts.
- [ ] 6.2 Add `wichtelnUrl` to `integration-test/src/stack.ts` and a Wichteln root check (200/301/302/307/308) through nginx to `integration-test/src/infra.tests.ts`. Verify: the check fails with a message naming Wichteln when the service is stopped and passes against the running smoke stack.

## 7. Pipeline

- [x] 7.1 Add the `test-wichteln` job (`pnpm test` in `wichteln/`) and the `build-wichteln` job (`wichteln/Dockerfile`, tag `homeserver-wichteln:latest`, GHA cache scope `homeserver-wichteln`, artifact `homeserver-wichteln`), add `build-wichteln` to `integration-smoke`'s `needs`, artifact download and `docker load`, add `wichteln.gutschi.site` to the smoke `/etc/hosts`, add the image download/load and `rsync` to `deploy`, and add both jobs to `all-build-checks`' `needs`. Verify: the workflow YAML parses, every new `needs`/artifact name matches its producer, and a dry read of the deploy steps loads and removes the new tar like the existing images.

## 8. Integration verification

- [ ] 8.1 Run the full local gate: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint:ci`, `pnpm --filter '!@homeserver/integration-test' test`, build all five images, generate the smoke certificates, add `wichteln.gutschi.site` to `/etc/hosts`, boot the smoke stack with `integration-test/docker-compose.ci.yml`, run `pnpm --filter @homeserver/integration-test test`, and tear the stack down. Verify: every command exits 0, the Wichteln container is healthy, and `https://wichteln.gutschi.site/` answers through nginx.

## Workflow follow-up

- No GitHub issue exists; change and branch are `wichteln` by explicit user instruction. If the repo's issue-first rule must be honoured before merge, file the issue and rename both.
- The branch is intentionally based on `origin/main`, which does not yet contain the #380 spec restructure. The `infrastructure` and `pipeline` deltas can only be archived after #380 merges and this branch is rebased onto the new `main`; rebase and re-run `openspec validate --strict` before shipping.
- Open a follow-up issue to extend the backup and restore service to `postgreswichteln`; this change deliberately leaves the new database without a backup.
