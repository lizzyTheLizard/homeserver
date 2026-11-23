# Tasks

## 1. Application Dockerfiles

- [ ] 1.1 Rewrite `services/web/Dockerfile` and `services/wichteln/Dockerfile` in the same simplified form (single build stage, runtime stage with revision args, same `COPY` lines including `public/`) so they differ only in the service name; add `services/wichteln/public/.gitkeep`. Verify `docker build -f services/web/Dockerfile .` and `docker build -f services/wichteln/Dockerfile .` both succeed and each container starts and serves its ping/health route
- [ ] 1.2 Check whether `libc6-compat` is still needed; drop it if both builds and starts pass without it. Verify with the same two builds
- [ ] 1.3 Add `.github/scripts/dockerfiles.test.mjs` asserting both Dockerfiles are equal after replacing the service name. Verify `node --test .github/scripts/` passes and fails when one file is edited alone
- [ ] 1.4 Verify the base image `FROM` lines are pinned to exact tags (`grep -n '^FROM' services/*/Dockerfile`) and that `renovate.json5` needs no change for the two files

## 2. Backup service package

- [ ] 2.1 `git mv infrastructure/db-backup services/backup`; add `services/backup/package.json` (`@homeserver/backup`, private, `lint`, `lint:ci`, `test` = `node --test`, no `build`/`clean`) and `services/backup` to `pnpm-workspace.yaml`; run `pnpm install` to update `pnpm-lock.yaml`. Verify `pnpm --filter @homeserver/backup lint:ci` and `pnpm -r build` both succeed
- [ ] 2.2 Export the helpers of `restore-backup.mjs` and add `services/backup/test/restore-backup.tests.mjs` covering argument parsing, connection resolution, the prod-connection refusal and backup-file resolution. Verify `pnpm --filter @homeserver/backup test` passes and fails when a rule is broken on purpose
- [ ] 2.3 Rewrite `services/backup/Dockerfile` for the new context (`services/backup`, exact `FROM` tag, PostgreSQL client with its version-sync comment, scripts to `/usr/local/bin`). Verify `docker build services/backup` succeeds and the container starts, runs `crond` and `node /usr/local/bin/restore-backup.mjs` prints its usage
- [ ] 2.4 Switch `infrastructure/docker-compose.yml` to `ghcr.io/lizzythelizard/homeserver-backup:latest` without a `build:` section. Verify `docker compose -f infrastructure/docker-compose.yml config` is valid

## 3. Pipelines and change detection

- [ ] 3.1 Extend `.github/scripts/detect-changes.mjs` so `backup` is a service (a change under `services/backup/` or to shared workspace files flags it); update `detect-changes.test.mjs`. Verify `node --test .github/scripts/detect-changes.test.mjs` passes
- [ ] 3.2 Update `.github/workflows/ci.yml`: matrix entries with `context` and `build-args` (web/wichteln: each its own `services/<name>/Dockerfile`, context `.`, revision args for both; backup: own Dockerfile, context `services/backup`; dev machine unchanged), remove the `revision-build-args` switch and conditional step, deploy waits for all four images. Verify the YAML parses and the final matrix reads correctly
- [ ] 3.3 Update `.github/workflows/pull-request.yml`: `backup` change output, `test-backup` job, stack-start builds with revision args for both applications and for the backup image, `test-backup` in the quality gate's `needs`. Verify the YAML parses and every job id referenced in `needs` exists

## 4. References and documentation

- [ ] 4.1 Update `.github/renovate.json5` (path in the PostgreSQL comments and warning text), `infrastructure/README.md` (table row, restore and token commands unchanged, Renovate paragraph), `README.md`, `CLAUDE.md` (three packages under `services/`, ops line) and `openspec/specs/README.md` (new `backup` entry). Verify `grep -rn 'db-backup' . --include='*' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive` returns nothing

## 5. Integration

- [ ] 5.1 Run `pnpm lint`, `pnpm test` and `pnpm build`, then start the stack with `docker compose up` locally (or confirm the pull request stack start) and verify web, Wichteln and backup containers are running/healthy; run `backup.sh` once by hand against the dev stack. Verify the dump file is written and the OneDrive upload succeeds
