# Design

## Context

Today `pipeline.yml` calls the reusable `service.yml` (lint, test, build+publish, per-service deploy) per changed service, plus `stack-start`, `deploy-infrastructure` and `quality-gate`. Observed gaps: the PR build job discards its image (`push` only on main) and `stack-start` runs `docker compose pull --ignore-buildable`, so it tests the registry's `latest`, not the PR's code. `detect-changes.mjs` handles pull request, push and dispatch events and reports the three services plus `infrastructure`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:** two workflows with no event conditionals; the PR's stack start tests the PR's images; main publishes and deploys unconditionally.

**Non-Goals:** changing the Dockerfiles, test commands, the change guard, Renovate, branch protection or the deploy mechanism (rsync + `docker compose pull/up` over SSH).

## Decisions

1. **Files**: `.github/workflows/pull-request.yml` (name `Pull request`) and `.github/workflows/ci.yml` (name `CI`); delete `pipeline.yml` and `service.yml`. The reusable workflow existed to share lint/test/build/deploy per service; with those split by pipeline there is little left to share, and a matrix in `ci.yml` plus two small test jobs in `pull-request.yml` are clearer. Alternative: keep `service.yml` with flags — rejected, it would keep the event conditionals this change removes.
2. **Lint**: one job running `pnpm run lint:ci` at the root (`pnpm -r lint:ci`), no `needs`, so it runs beside `changes` and `change-guard`.
3. **Tests**: `test-web` and `test-wichteln` jobs, `needs: changes`, `if` the service's flag is true; they reuse the existing commands (web: three vitest projects; Wichteln: `pnpm test`). The web job's Playwright browser cache is keyed on the installed Playwright version (`pnpm exec playwright --version`) instead of the lockfile hash, so unrelated dependency updates no longer invalidate it. They do not wait for lint.
4. **Stack start images**: after `changes`, a job builds each changed service with `docker/build-push-action` (`push: false`, `load: true`, tag `ghcr.io/<owner>/homeserver-<name>:latest`, existing gha cache scope) via a matrix over the changed services, then `docker compose pull` every service except the built ones and `docker compose up -d --build --wait`; compose's default pull policy (`missing`) keeps the loaded images. The simplest shape is a single job with conditional build steps (web, Wichteln, dev machine) so the images land in the same Docker daemon as the stack; separate jobs cannot share a daemon. Build and test run in parallel because they are different jobs. Compose services with a `build:` section (db-backup) keep being built by `--build`. Alternative: upload images as artifacts between jobs — rejected as slower and more moving parts.
5. **Stack start only when relevant**: `detect-changes.mjs` keeps all four targets (`web`, `wichteln`, `dev-machine`, `infrastructure`) and only drops the push/dispatch branches (main no longer detects). The `stack-start` job runs `if` any of the four flags is `true`; otherwise (docs-only, `openspec/` only) it is skipped, which the Quality Gate treats as success. A PR changing only `infrastructure/` starts the stack from the latest images with the new compose file. The pipeline file list becomes `pull-request.yml`, `ci.yml`.
6. **Revision build args**: the web image gets commit, branch, run id and build time in both pipelines.
7. **Quality Gate**: `needs` every job of `pull-request.yml`, `if: always()`, same pass/fail logic as today. The job name stays "Quality Gate", which is what branch protection and Renovate auto-merge key on; the workflow rename does not affect the check name.
8. **CI**: matrix job `publish` over web, Wichteln and dev-machine (build with buildx, push `latest`, gha cache), then `deploy` (`needs: publish`) with the current deploy-infrastructure steps (rsync, then flock-serialised `compose pull`, `up -d --force-recreate --remove-orphans`, `image prune`). Concurrency: group per ref, `cancel-in-progress: false` on CI; `cancel-in-progress: true` on the pull request pipeline.
9. **Triggers**: `pull-request.yml` on `pull_request` (opened, synchronize, reopened); `ci.yml` on `push` to main and `workflow_dispatch`. Manual dispatch was only meaningful as a full run, which CI now is.

## Risks / Trade-offs

- Main publishes without re-running lint/tests → relies on the PR having passed "Quality Gate" and being up to date with main (already required by branch protection). A direct push to main would skip checks; not possible with branch protection.
- Every merge rebuilds and redeploys all containers, including unchanged ones → accepted per request; the gha build cache keeps builds short.
- Pull requests from forks or without `packages: read` cannot pull unchanged `latest` images → this repository has no fork PRs; the job declares `packages: read`.
- Renaming the workflow resets its run history in the Actions UI → acceptable.
- A pull request that adds a new service image not yet published has nothing to pull as `latest` → it is reported as changed (new service folder) and so is built.

## Migration Plan

Land the change in one PR. That PR itself runs the new "Pull request" pipeline (workflow files changed, so all services are built). After merge, "CI" publishes and deploys all images once. Rollback: revert the commit; the required check name is unchanged throughout.
