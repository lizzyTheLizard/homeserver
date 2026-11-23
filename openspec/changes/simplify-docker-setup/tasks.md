# Tasks

## 1. Shared application Dockerfile

- [ ] 1.1 Create the root `Dockerfile` (`ARG SERVICE`, single build stage, runtime stage with revision args) and `services/wichteln/public/.gitkeep`; remove `services/web/Dockerfile` and `services/wichteln/Dockerfile`. Verify `docker build --build-arg SERVICE=web .` and `--build-arg SERVICE=wichteln .` both succeed and each container starts and serves its ping/health route
- [ ] 1.2 Check whether `libc6-compat` is still needed; drop it if both builds and starts pass without it. Verify with the same two builds
- [ ] 1.3 Verify the base image `FROM` line is pinned to an exact tag (`grep -n '^FROM' Dockerfile`) and that `renovate.json5` needs no change to cover the root `Dockerfile`

## 2. Backup service package

- [ ] 2.1 `git mv infrastructure/db-backup services/backup`; add `services/backup/package.json` (`@homeserver/backup`, private, `lint`, `lint:ci`, `test` = `node --test`, no `build`/`clean`) and `services/backup` to `pnpm-workspace.yaml`; run `pnpm install` to update `pnpm-lock.yaml`. Verify `pnpm --filter @homeserver/backup lint:ci` and `pnpm -r build` both succeed
- [ ] 2.2 Export the helpers of `restore-backup.mjs` and add `services/backup/test/restore-backup.tests.mjs` covering argument parsing, connection resolution, the prod-connection refusal and backup-file resolution. Verify `pnpm --filter @homeserver/backup test` passes and fails when a rule is broken on purpose
- [ ] 2.3 Rewrite `services/backup/Dockerfile` for the new context (`services/backup`, exact `FROM` tag, PostgreSQL client with its version-sync comment, scripts to `/usr/local/bin`). Verify `docker build services/backup` succeeds and the container starts, runs `crond` and `node /usr/local/bin/restore-backup.mjs` prints its usage
- [ ] 2.4 Switch `infrastructure/docker-compose.yml` to `ghcr.io/lizzythelizard/homeserver-backup:latest` without a `build:` section. Verify `docker compose -f infrastructure/docker-compose.yml config` is valid

## 3. Pipelines and change detection

- [ ] 3.1 Extend `.github/scripts/detect-changes.mjs`: `backup` becomes a service, and a change to the root `Dockerfile` reports `web` and `wichteln` only; update `detect-changes.test.mjs` (including the test that referenced per-service Dockerfiles). Verify `node --test .github/scripts/detect-changes.test.mjs` passes
- [ ] 3.2 Update `.github/workflows/ci.yml`: matrix entries with `file`, `context` and `build-args` (web/wichteln: root `Dockerfile` + `SERVICE` + revision args; backup: `services/backup`; dev machine unchanged), remove the `revision-build-args` switch and conditional step, deploy waits for all four images. Verify the YAML parses and the final matrix reads correctly
- [ ] 3.3 Update `.github/workflows/pull-request.yml`: `backup` change output, `test-backup` job, stack-start builds with the shared Dockerfile (revision args for both applications) and for the backup image, `test-backup` in the quality gate's `needs`. Verify the YAML parses and every job id referenced in `needs` exists

## 4. References and documentation

- [ ] 4.1 Update `.github/renovate.json5` (path in the PostgreSQL comments and warning text), `infrastructure/README.md` (table row, restore and token commands unchanged, Renovate paragraph), `README.md`, `CLAUDE.md` (three packages under `services/`, ops line) and `openspec/specs/README.md` (new `backup` entry). Verify `grep -rn 'db-backup' . --include='*' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive` returns nothing

## 5. Integration

- [ ] 5.1 Run `pnpm lint`, `pnpm test` and `pnpm build`, then start the stack with `docker compose up` locally (or confirm the pull request stack start) and verify web, Wichteln and backup containers are running/healthy; run `backup.sh` once by hand against the dev stack. Verify the dump file is written and the OneDrive upload succeeds
