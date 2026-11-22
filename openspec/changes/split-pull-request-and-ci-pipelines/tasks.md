# Tasks

## 1. Change detection

- [x] 1.1 Update `.github/scripts/detect-changes.mjs`: drop the push/dispatch handling (pull request only, all four targets including `infrastructure` stay), and make `pull-request.yml` and `ci.yml` the pipeline files that report every service changed; update `detect-changes.test.mjs` accordingly and verify `node --test '.github/scripts/*.test.mjs'` passes.

## 2. Pull request pipeline

- [x] 2.1 Create `.github/workflows/pull-request.yml` (pull request trigger, cancelling concurrency) with the `lint` job (root `pnpm run lint:ci`), `changes` and `change-guard` jobs all starting in parallel; verify with `actionlint` (or `gh workflow view`) that the file parses.
- [x] 2.2 Add `test-web` (three vitest projects, Playwright cache) and `test-wichteln` jobs, each `needs: changes` and conditional on its flag; verify they are skipped for an unchanged service in the PR's run.
- [x] 2.3 Add the `stack-start` job (`needs: changes`, runs only if `web`, `wichteln`, `dev-machine` or `infrastructure` is `true`): build changed services' images with `load: true` under their `latest` tag (web with revision build args), pull only the unchanged ones, start the stack (compose keeps the locally built images) and wait for health; keep the existing port 53, placeholder env, placeholder certificate, log and teardown steps. Verify on the PR that a changed service runs the locally built image and an unchanged one the registry image, and that a documentation-only PR skips the job.
- [x] 2.4 Add the `quality-gate` job ("Quality Gate", `if: always()`, needs every job) with the current pass/fail logic; verify the required check is reported and passes on the PR.
- [x] 2.5 Key the web job's Playwright browser cache on the installed Playwright version instead of the lockfile hash; verify the cache key in the job log contains the version and stays the same across a run that changes other dependencies.

## 3. CI pipeline

- [x] 3.1 Create `.github/workflows/ci.yml` (push to main, `workflow_dispatch`, non-cancelling concurrency) with a `publish` matrix building and pushing web, Wichteln and dev machine `latest` images (web with revision build args), and a `deploy` job (`needs: publish`) with the current whole-stack deploy steps; verify with `actionlint` and, after merge, that the run publishes all three images and deploys.
- [x] 3.2 Delete `.github/workflows/pipeline.yml` and `.github/workflows/service.yml`; verify nothing else in the repo references them (`grep -r "pipeline.yml\|service.yml"` outside `openspec/changes/archive`).

## 4. Documentation

- [x] 4.1 Update the CI/CD section of `infrastructure/README.md` and the sentence about the single pipeline in `README.md` to describe the two pipelines; verify with `grep` that no stale `pipeline.yml` reference remains.
- [x] 4.2 Run `pnpm lint` and `openspec validate split-pull-request-and-ci-pipelines --strict`; verify both pass.

## Workflow follow-up

- Review the full diff, commit and push once, then archive the change with `openspec-archive-change`.
