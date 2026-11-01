# Tasks

## 1. Remove the skill layer

- [x] 1.1 Delete `.agents/skills/gh-change-start/`, `.agents/skills/gh-change-ship/` and `.agents/skills/gh-issue-draft/` (including its `issue-template.md`), and remove their rows and flow references from `AGENTS.md` and `README.md`. Verify `ls .agents/skills` lists only `openspec-*` folders and `grep -rn "gh-change-start\|gh-change-ship\|gh-issue-draft" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec .` returns nothing.

## 2. Encode the lifecycle in openspec/config.yaml

- [x] 2.1 Replace `context` and `rules.proposal` in `openspec/config.yaml`: no GitHub issue anywhere; the change name is a kebab-case slug and is also the branch; before the first artifact exists, a clean tree, `git fetch origin` and `git switch -c <change> origin/main`; the reviewed plan is committed to that branch before implementation starts; change artifacts never land on the default branch. Verify `openspec instructions proposal --change branch-per-change --json` returns that context and that its `rules` state the no-issue and name-equals-branch rule.
- [x] 2.2 Replace `operations.apply.guidance` (drop the `(#<NUMBER>)` suffix and the `gh-change-ship` mention) and add `operations.archive.guidance` for the final step: archive commit isolated to `openspec/`, push, open the PR to `main` with a `## Summary` body, an `OpenSpec-Change: <change>` line and a link to the archived proposal, then `gh pr merge --auto --squash`. Verify `openspec instructions apply --change branch-per-change --json` operationGuidance contains the commit/push rule with no issue number, and `openspec instructions archive --change branch-per-change --json` operationGuidance contains the PR rule.
- [x] 2.3 Rewrite the "Development Workflow (OpenSpec)" section of `AGENTS.md` (and the matching `README.md` section) to describe the config-driven lifecycle — propose on `<change>`, apply one task per commit, archive → PR — with no issue step and no hand-written skills. Verify `grep -n "config.yaml\|operations\|rules\|origin/main" AGENTS.md` shows the described keys exist in the file, and `openspec status --change branch-per-change` still reports all artifacts complete.

## 3. Local enforcement

- [x] 3.1 Add `.githooks/pre-commit` (executable): reject staging `openspec/changes/**` or `openspec/specs/**` on `main`/`master`, and on another branch reject staging `openspec/changes/<other>/` when `<other>` is not the branch name (`archive/` exempt). Verify on a scratch branch: staging `openspec/changes/other-change/proposal.md` exits non-zero, staging `openspec/changes/branch-per-change/tasks.md` exits zero, and staging it on `main` exits non-zero.
- [x] 3.2 Add `.githooks/pre-push` (executable) that rejects any refspec targeting `refs/heads/main`. Verify `git push --dry-run origin main:main` from a scratch clone is rejected and `git push --dry-run origin HEAD:refs/heads/branch-per-change` is allowed.
- [x] 3.3 Add `"prepare": "git config core.hooksPath .githooks"` to the root `package.json` scripts. Verify `pnpm install` completes and `git config core.hooksPath` prints `.githooks`.

## 4. CI guard

- [x] 4.1 Add `scripts/change-guard.mjs` exporting `resolveChangeForBranch(branch, paths)` plus a CLI entrypoint reading `HEAD_REF`/`BASE_REF`, and `scripts/change-guard.test.mjs` covering matching branch, mismatched branch, archived folder, no change path, and two changes. Verify `node --test scripts/change-guard.test.mjs` passes and `HEAD_REF=branch-per-change BASE_REF=origin/main node scripts/change-guard.mjs` passes on this branch.
- [x] 4.2 Add `.github/workflows/change-guard.yml` triggered by `pull_request`, checking out with `fetch-depth: 0`, running the guard with `HEAD_REF=${{ github.head_ref }}` and `BASE_REF=origin/${{ github.base_ref }}`. Verify the job's command passes locally for this branch and, once the branch is pushed and a PR is open, the `change-guard` check reports success.

## 5. Integration verification

- [x] 5.1 Prove the guard rejects a mismatch end to end: run `HEAD_REF=wrong-branch BASE_REF=origin/main node scripts/change-guard.mjs` (must exit non-zero and name `branch-per-change`) and run `openspec validate branch-per-change --strict` (must pass).
- [x] 5.2 Prove the config contract is the only description left: run `openspec instructions proposal|apply|archive --change branch-per-change --json` and confirm branch, no-issue, commit and PR rules appear exactly once each, with no reference to a deleted skill.
