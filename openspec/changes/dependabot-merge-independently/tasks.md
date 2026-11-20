# Tasks

## 1. Workflow cleanup

- [ ] 1.1 Delete `.github/workflows/dependabot-update-branch.yml`
- [ ] 1.2 Check that `dependabot-auto-merge.yml` and `.github/dependabot.yml` need no change (no reference to the removed workflow) and that nothing else references `dependabot-update-branch`

## 2. Documentation

- [ ] 2.1 In `infrastructure/README.md` (Dependabot auto-merge section), state that the `main` ruleset must not require up-to-date branches, why (independent Dependabot pull requests, Dependabot rebases on conflicts itself, nothing may push to Dependabot branches), and how to recover a stuck pull request (`@dependabot rebase` / `@dependabot recreate`)

## 3. Repository settings (needs admin rights; confirm with the user before running)

- [ ] 3.1 Read ruleset 18465616 with `gh api repos/lizzyTheLizard/homeserver/rulesets/18465616`, set `strict_required_status_checks_policy` to `false` and send the otherwise unchanged ruleset back with `gh api -X PUT`; verify that "Quality Gate" is still required and the other rules are unchanged
- [ ] 3.2 List open Dependabot pull requests that contain a commit not authored by Dependabot (`gh pr list --author app/dependabot`, check commits) and comment `@dependabot recreate` on each

## 4. Verification

- [ ] 4.1 Run `pnpm lint:ci` and the pipeline script tests (`node --test '.github/scripts/*.test.mjs'`)
- [ ] 4.2 After the pull request merged, check that several open Dependabot patch/minor pull requests merge one after another without manual action and that a conflicting one is rebased by Dependabot
