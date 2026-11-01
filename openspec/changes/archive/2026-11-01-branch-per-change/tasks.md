# Tasks

## 1. Remove the skill layer

- [x] 1.1 Delete `.agents/skills/gh-change-start/`, `.agents/skills/gh-change-ship/` and `.agents/skills/gh-issue-draft/` (including its `issue-template.md`), and remove their rows and flow references from `AGENTS.md` and `README.md`. Verify `ls .agents/skills` lists only `openspec-*` folders and `grep -rn "gh-change-start\|gh-change-ship\|gh-issue-draft" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec .` returns nothing.

## 2. Encode the lifecycle in openspec/config.yaml

- [x] 2.1 Replace `context` and `rules.proposal` in `openspec/config.yaml`: no issue step anywhere; the change name is a kebab-case slug and is also the branch; before the first artifact exists, a clean tree, `git fetch origin` and `git switch -c <change> origin/main`; the reviewed plan is committed to that branch before implementation starts; change artifacts never land on the default branch. Verify `openspec instructions proposal --change branch-per-change --json` returns that context and that its `rules` state the name-equals-branch rule.
- [x] 2.2 Replace `operations.apply.guidance` (drop the `(#<NUMBER>)` suffix and the `gh-change-ship` mention) and add `operations.archive.guidance` for the final step: archive commit isolated to `openspec/`, push, open the PR to `main` with a `## Summary` body, an `OpenSpec-Change: <change>` line and a link to the archived proposal, then `gh pr merge --auto --squash`. Verify `openspec instructions apply --change branch-per-change --json` operationGuidance contains the commit/push rule with no issue number, and `openspec instructions archive --change branch-per-change --json` operationGuidance contains the PR rule.
- [x] 2.3 Rewrite the "Development Workflow (OpenSpec)" section of `AGENTS.md` (and the matching `README.md` section) to describe the config-driven lifecycle — propose on `<change>`, apply one task per commit, archive → PR — with no issue step and no hand-written skills. Verify `grep -n "config.yaml\|operations\|rules\|origin/main" AGENTS.md` shows the described keys exist in the file, and `openspec status --change branch-per-change` still reports all artifacts complete.

## 3. CI guard

- [x] 3.1 Add `scripts/change-guard.mjs` exporting `resolveChangeForBranch(branch, paths)` plus a CLI entrypoint reading `HEAD_REF`/`BASE_REF`, and `scripts/change-guard.test.mjs` covering the unarchived case, the archived case, the mismatched branch, the unsynced-specs case, a delta-free archive, no change path, and two changes. Verify `node --test scripts/change-guard.test.mjs` passes and `HEAD_REF=branch-per-change BASE_REF=origin/main node scripts/change-guard.mjs` passes on this branch.
- [x] 3.2 Add the `change-guard` job to `.github/workflows/homeserver.yml` with a `pull_request` trigger, gate the existing jobs with `if: github.event_name != 'pull_request'`, check out with `fetch-depth: 0` and run the guard with `HEAD_REF=${{ github.head_ref }}` and `BASE_REF=origin/${{ github.base_ref }}`; delete the separate `change-guard.yml`. Verify the job's command passes locally and, once the PR is open, the `Change guard` check reports success.

## 4. Integration verification

- [x] 4.1 Prove the guard rejects finished-work violations end to end: `HEAD_REF=wrong-branch` must fail naming the branch, and a simulated PR that still carries `openspec/changes/branch-per-change/` must fail with the archive instruction; `openspec validate branch-per-change --strict` must pass.
- [x] 4.2 Prove the config contract is the only description left: run `openspec instructions proposal|apply|archive --change branch-per-change --json` and confirm branch, no-issue, commit and PR rules appear once each, with no reference to a deleted skill.
