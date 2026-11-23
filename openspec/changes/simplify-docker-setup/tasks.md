# Tasks

## 1. Shared application Dockerfile

- [ ] 1.1 Create the root `Dockerfile` (`ARG SERVICE`, single build stage, runtime stage with revision args) and `services/wichteln/public/.gitkeep`; remove `services/web/Dockerfile` and `services/wichteln/Dockerfile`. Verify `docker build --build-arg SERVICE=web .` and `--build-arg SERVICE=wichteln .` both succeed and each container starts and serves its ping/health route
- [ ] 1.2 Check whether `libc6-compat` is still needed; drop it if both builds and starts pass without it. Verify with the same two builds
- [ ] 1.3 Verify the base image `FROM` lines are pinned to exact tags (`grep -n '^FROM' Dockerfile`) and that `renovate.json5` needs no change to cover the root `Dockerfile`

## 2. Pipelines and change detection

- [ ] 2.1 Update `.github/workflows/ci.yml`: `file: Dockerfile`, `build-args` with `SERVICE` for web and Wichteln (dev machine keeps its own file), revision args for both, remove the `revision-build-args` matrix switch and the conditional step. Verify with `actionlint` or a YAML parse and by reading the final matrix
- [ ] 2.2 Update `.github/workflows/pull-request.yml` stack-start builds the same way (revision args for both). Verify as in 2.1
- [ ] 2.3 Extend `.github/scripts/detect-changes.mjs` so a change to the root `Dockerfile` reports `web` and `wichteln` only, and add test cases (also update the "every service folder" test that referenced per-service Dockerfiles). Verify `node --test .github/scripts/detect-changes.test.mjs` passes

## 3. Backup image

- [ ] 3.1 Reduce `infrastructure/db-backup/Dockerfile` to `FROM` + `apk add postgresql16-client` (keep the version-sync comment); mount `./db-backup` read-only at `/opt/backup` in `infrastructure/docker-compose.yml` and point the entrypoint there; set the executable bit on the scripts with `git update-index --chmod=+x`. Verify `docker compose -f infrastructure/docker-compose.yml config` is valid and `docker compose build backup` succeeds
- [ ] 3.2 Update script paths (`entrypoint.sh` cron line, `backup.sh` upload call, `restore-backup.mjs` header) to `/opt/backup`. Verify `grep -rn '/usr/local/bin' infrastructure` returns nothing and, in a started backup container, `crond` runs and `node /opt/backup/restore-backup.mjs` prints its usage
- [ ] 3.3 Update `infrastructure/README.md` (commands, "built from" table row) and the restore command in the root `README.md`. Verify the documented commands match the new paths

## 4. Integration

- [ ] 4.1 Run `pnpm lint`, `pnpm test` and `pnpm build`, then start the stack with `docker compose up` locally (or confirm the pull request stack start) and verify web, Wichteln and backup containers are running/healthy
