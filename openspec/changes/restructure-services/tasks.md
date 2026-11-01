# Tasks

## 1. Create the services folder and move the services

- [x] 1.1 Create `services/` and move `web`, `assistant`, `whatsapp-bridge`, `wichteln` and `dev-machine` into it, updating `pnpm-workspace.yaml` globs and the root `package.json` `dev:*`/`build`/`test` script package paths so `pnpm install` and `pnpm build` still resolve every `@homeserver/*` package; verify with `pnpm install && pnpm build` succeeding from the new layout.
- [x] 1.2 Update every Dockerfile `COPY` and `--filter`/context path that referenced the old top-level folders (`web/Dockerfile`'s `COPY ./db`, `COPY ./assistant/...`, `wichteln/Dockerfile`, `assistant/Dockerfile`, `whatsapp-bridge/Dockerfile`, `dev-machine/Dockerfile`) to the `services/<name>/` paths; verify each image builds with `docker build` against the new context.

## 2. Rename the WhatsApp bridge to whatsapp

- [x] 2.1 Rename the `services/whatsapp-bridge` folder, workspace package `@homeserver/whatsapp-bridge` and every import/reference to `@homeserver/whatsapp-bridge`, `whatsapp-bridge`, the compose service and the `homeserver-wichteln`-style image reference to `whatsapp`; verify `pnpm --filter @homeserver/whatsapp build && pnpm --filter @homeserver/whatsapp test && pnpm lint:ci` all pass with no remaining `whatsapp-bridge` references.

## 3. Standardise image names on GHCR

- [x] 3.1 Change the compose stack's image names to the GHCR names `ghcr.io/<owner>/homeserver-web:latest`, `ghcr.io/<owner>/homeserver-assistant:latest`, `ghcr.io/<owner>/homeserver-whatsapp:latest`, `ghcr.io/<owner>/homeserver-wichteln:latest` and `ghcr.io/<owner>/homeserver-dev-machine:latest`, and switch them from `pull_policy: never` to pulling from the registry; verify the compose file references only the GHCR names.

## 4. Split the pipeline into per-service workflows

- [x] 4.1 Replace `homeserver.yml` with one path-filtered workflow per service (`services/web/**`, `services/assistant/**`, `services/whatsapp/**`, `services/wichteln/**`, `services/dev-machine/**`) that builds, publishes to GHCR and deploys only its own image, plus a shared workflow for the change guard, lint and the stack smoke suite (which pulls the latest images from GHCR); verify the workflow YAML is valid and that a push touching only `services/web/` triggers only the web workflow.

## 5. Reorganise the database

- [ ] 5.1 Move `db/` into `services/web/db/`, delete `110_microsoft.sql`, and update `app/shared/_external/db/migrate.ts` (and any test/PGlite seeding) to resolve migrations from the new location; verify `pnpm --filter @homeserver/web test` passes and the integration tests seed from `services/web/db/`.
- [ ] 5.2 Add `services/assistant/db/` with a migration creating `assistant_microsoft_token`, add a migration runner to the assistant's startup, and update `assistant/microsoft/data.ts` to use `assistant_microsoft_token`; verify `pnpm --filter @homeserver/assistant test` passes against a fresh PGlite/in-memory DB.
- [ ] 5.3 Point `wichteln`'s `DB_CONNECTION_STRING` at the shared homeserver database, remove the `postgreswichteln` service/database and its named volume from `docker-compose.yml`, and update the `wichteln` dev-database bootstrap notes; verify the compose stack comes up with `wichteln` healthy against the shared database and `pnpm --filter @homeserver/wichteln test` passes.

## 6. Documentation and integration verification

- [ ] 6.1 Update `README.md`, `AGENTS.md`, `infrastructure/README.md` and the compose `env.example` to reflect the `services/` layout, the GHCR image names, the `whatsapp` name and the shared-database prefixes; verify the documented commands run as written.
- [ ] 6.2 Run the full `pnpm lint:ci && pnpm build && pnpm test` and the integration smoke suite from a clean checkout to confirm the branch is green end to end.

## Workflow follow-up

- Archive the change after review, reconciling the in-flight `wichteln` change (whose specs still describe a separate Wichteln database) with this change's shared-database decision.
