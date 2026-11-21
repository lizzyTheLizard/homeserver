# Tasks

## 1. Workflow

- [x] 1.1 Add `.github/workflows/renovate.yml` as described in design.md decisions 1-5: triggers `schedule` (cron `0 3 * * *`), `push` to `main` and `workflow_dispatch` with a `log-level` input; `concurrency` group `renovate` without cancelling; `permissions: contents: read`; checkout and `renovatebot/github-action` pinned to the latest exact version tag; `token: ${{ secrets.RENOVATE_TOKEN }}`; environment `RENOVATE_REPOSITORIES`, `RENOVATE_ONBOARDING: "false"`, `RENOVATE_REQUIRE_CONFIG: required`, `LOG_LEVEL`
- [x] 1.2 Check `.github/renovate.json5` needs no change for a self-hosted run (it must not set `platform`, `token` or `repositories`); adjust only if a run shows a problem
- [ ] 1.3 Validate the workflow with `actionlint` (or `pnpm dlx actionlint`) and the config with `renovate-config-validator --strict .github/renovate.json5`; run `node --test '.github/scripts/*.test.mjs'` and `pnpm lint:ci`

## 2. Documentation

- [x] 2.1 In `infrastructure/README.md` replace "the hosted Renovate GitHub App, installed on this repository by the owner" by the workflow description: triggers (night, push to `main`, manual with debug log level), `RENOVATE_TOKEN` and why `GITHUB_TOKEN` cannot be used, token permissions and rotation, how to start a run and read its log, that the hosted app must not be installed, how to unstick a pull request (rebase checkbox or dashboard checkbox is handled at the next run, or dispatch the workflow)

## 3. Rollout (outside the code; confirm with the user before running)

- [ ] 3.1 The owner creates the token (design.md decision 3) and stores it as Actions secret `RENOVATE_TOKEN` (`gh secret set RENOVATE_TOKEN`)
- [ ] 3.2 After the pull request merged, dispatch the workflow once (`gh workflow run renovate.yml -f log-level=debug`), follow it (`gh run watch`) and confirm the Dependency Dashboard issue and the first Renovate pull requests exist
- [ ] 3.3 The owner uninstalls the Renovate GitHub App from the repository (Settings → Applications) after step 3.2 succeeded

## 4. Verification

- [ ] 4.1 Check that a Renovate pull request starts the pipeline, that a merge to `main` starts a Renovate run which rebases the next pull request, and that patch/minor pull requests merge one after another without manual action
