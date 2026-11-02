# Tasks

## 1. Pipeline scripts

- [x] 1.1 Add `.github/scripts/detect-changes.mjs` (exported pure function from changed paths to `{web, assistant, whatsapp, wichteln, dev-machine, infrastructure}` plus a CLI that reads the diff range from the event and writes `GITHUB_OUTPUT`) with `detect-changes.test.mjs` covering every "The pipeline first detects what changed" scenario; verify with `node --test '.github/scripts/*.test.mjs'`
- [x] 1.2 Restore the change guard from `3aeb40d` into `.github/scripts/change-guard.mjs` and `change-guard.test.mjs`, tighten the sync rule to per-delta-path matching, and add tests for every `ci/change-guard` scenario including "A delta synced into a different capability fails"; verify with `node --test '.github/scripts/*.test.mjs'`

## 2. Single pipeline

- [x] 2.1 Add `.github/workflows/service.yml` (`workflow_call` only) with the lint → test → build → deploy chain and the inputs from design decision 1, reusing the `setup`, `build-publish` and `deploy-service` actions; verify it passes `actionlint`
- [x] 2.2 Add `.github/workflows/pipeline.yml` with the triggers, concurrency, `changes` and `change-guard` jobs, the five service calls (web with its three test projects, Playwright and revision build args; dev machine without lint/test), the `deploy-infrastructure` job and the always-running "Quality Gate" per design decisions 2–6; verify it passes `actionlint` and that every job id appears in the gate's `needs`
- [x] 2.3 Delete `web.yml`, `assistant.yml`, `whatsapp.yml`, `wichteln.yml`, `dev-machine.yml` and `infrastructure.yml`; verify `.github/workflows/` contains only `pipeline.yml`, `service.yml` and `dependabot-auto-merge.yml`

## 3. Documentation

- [x] 3.1 Rewrite the CI/deploy bullets in `infrastructure/README.md` §6 and the services/workflow sentence in `CLAUDE.md` to describe the single pipeline, its stages, the infrastructure-deploy rule and "Quality Gate" as the one required check; verify no remaining reference to the deleted workflow files with `grep -rn "web.yml\|assistant.yml\|whatsapp.yml\|wichteln.yml\|dev-machine.yml\|infrastructure.yml" --exclude-dir=node_modules --exclude-dir=openspec .`
- [ ] 3.2 Update the `pipeline` and `ci/change-guard` entries in `openspec/specs/README.md` to match the new behaviour; verify the descriptions mention the single pipeline and the quality gate

## 4. Dependabot auto-merge

- [ ] 4.1 Create a GitHub App with Contents and Pull requests read/write access, install it on the repository, and store its ID and private key as the Dependabot secrets `AUTOMERGE_APP_ID` and `AUTOMERGE_APP_PRIVATE_KEY` (manual step for the user, with step-by-step instructions); verify `gh api repos/lizzyTheLizard/homeserver/dependabot/secrets` lists both secrets
- [ ] 4.2 Change `dependabot-auto-merge.yml` to get a token with `actions/create-github-app-token` and use it for merging and approving; verify it passes `actionlint`
- [ ] 4.3 Document the GitHub App and its two Dependabot secrets in `infrastructure/README.md` §6; verify the section names both secrets

## Workflow follow-up

- Archive the change (syncing the `pipeline`, `ci/change-guard` and `infrastructure` deltas), push, and open the pull request; confirm the Pipeline run shows the change guard passing and "Quality Gate" green.
- With the user's confirmation, update the `default` ruleset on `main` so its only required status check is "Quality Gate" (strict policy kept), replacing the five `Gate …` checks; only then let auto-merge proceed.
- After the merge, watch the first `main` run: every service is rebuilt and published and the whole stack is deployed once by the infrastructure deploy.
- After the merge, check that the next Dependabot pull request starts a Pipeline run on `main` after it auto-merges.
