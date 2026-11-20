# Tasks

## 1. Renovate configuration

- [x] 1.1 Add `.github/renovate.json5` as described in design.md decision 3 (recommended preset, Zurich timezone, daily schedule before 6am Zurich time, one-day minimum release age, `rebaseWhen: "behind-base-branch"`, `platformAutomerge`, automerge for minor/patch only, PR concurrency limit 5, `postgres` major updates disabled)
- [x] 1.2 Validate it with `pnpm dlx --package renovate renovate-config-validator .github/renovate.json5` (or `npx -p renovate renovate-config-validator`) and fix findings

## 2. Remove Dependabot

- [x] 2.1 Delete `.github/dependabot.yml`, `.github/workflows/dependabot-auto-merge.yml` and `.github/workflows/dependabot-update-branch.yml`
- [x] 2.2 In `.github/scripts/detect-changes.test.mjs` replace the `.github/dependabot.yml` and `dependabot-auto-merge.yml` paths of the "report nothing" test by `.github/renovate.json5`; keep the test meaning
- [x] 2.3 In `infrastructure/db-backup/Dockerfile` change the comment "(Dependabot ignores postgres major updates)" to Renovate
- [x] 2.4 Check with `grep -ri dependabot` that nothing outside `openspec/changes/archive` and the Dependabot-branch example in `change-guard.test.mjs` refers to Dependabot any more (that example is only a branch name; leave or switch to a `renovate/` branch name)

## 3. Documentation

- [x] 3.1 In `infrastructure/README.md` replace the "Dependabot auto-merge" section by a Renovate section: what is updated and when (daily before 6 a.m. Zurich time), auto-merge for patch/minor, majors manual, strict ruleset kept and Renovate rebasing, PR limit, `postgres` major rule, hosted app installed by the owner, how to unstick a pull request (rebase checkbox in the PR body / dependency dashboard, or close it so Renovate recreates it), optional removal of the unused `homeserver-automerge` app and its secrets

## 4. Rollout (outside the code; confirm with the user before running)

- [ ] 4.1 After the pull request merged, the owner installs the Renovate GitHub App on this repository only (https://github.com/apps/renovate); no onboarding pull request should appear because the configuration already exists
- [x] 4.2 Close the open Dependabot pull requests (`gh pr list --author "app/dependabot"` then `gh pr close`) so Renovate's own pull requests replace them
- [ ] 4.3 Optionally delete the secrets `AUTOMERGE_APP_CLIENT_ID` and `AUTOMERGE_APP_PRIVATE_KEY` (Dependabot and Actions secret stores) and uninstall/delete the `homeserver-automerge` app

## 5. Verification

- [x] 5.1 Run `pnpm lint:ci` and `node --test '.github/scripts/*.test.mjs'`
- [ ] 5.2 After the first Renovate run check that patch/minor pull requests merge one after another without manual action (including a rebase after a merge and after a conflict) and that adjusting `prConcurrentLimit` is not needed; if platform auto-merge stalls on behind branches, set `platformAutomerge: false` or revisit design decision 3
