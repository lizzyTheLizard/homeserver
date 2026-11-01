# Proposal

## Why

The flow in this repo is issue-first: a change only exists once a GitHub issue exists, its name is `issue-<n>-<slug>`, and the pull request closes that issue. That coupling forces an issue for every piece of work, and nothing actually enforces the naming — so the workflow drifts. Branches such as `issue-#263-…` contain characters the contract forbids, `openspec/changes/wichteln` exists with no issue at all, and `/openspec-propose` runs on whatever branch happens to be checked out, which means a plan can be committed straight onto `main`.

The branch should be the unit of work, and it should exist before the change does: named after the change, holding the plan commit, every task commit and the archive, and the source of the pull request once the change is archived.

## What Changes

- Change names are plain kebab-case slugs (`branch-per-change`), and the branch name equals the change name. No `issue-<n>-` prefix and no closing issue.
- The three hand-written glue skills — `gh-change-start`, `gh-change-ship`, `gh-issue-draft` — are deleted together with their rows in `AGENTS.md` and `README.md`. Nothing hand-written wraps the OpenSpec workflows any more.
- The lifecycle moves into `openspec/config.yaml`, which the CLI already reads and injects into the stock workflows:
  - `context` carries the contract: create `<change>` from `origin/main` before the first artifact exists, never commit change artifacts on the default branch, keep plan, task and archive commits on the branch, and commit the reviewed plan before implementation starts.
  - `rules.proposal` states that a change starts from a request or an explicit name, and that the name is the branch.
  - `operations.apply.guidance` keeps the one-task-one-commit rule and the trailer format, without the `(#<n>)` issue suffix.
  - `operations.archive.guidance` performs the last step: commit the archive isolated to `openspec/`, open the PR to `main` with an `OpenSpec-Change:` body linking the archived proposal, and arm squash auto-merge.
- One enforcement point so the contract does not rely on an agent reading it: a CI guard fails a pull request whose head branch is not the change folder it adds. Direct pushes to the default branch are left to GitHub branch protection, not repository code.
- In-flight `issue-<n>-<slug>` work is not migrated: the guard compares branch to folder, never to a naming pattern, so an existing change keeps working under its old name.

## Capabilities

### New Capabilities

- `ci/change-guard`: CI binds every change to the branch named after it — a pull request that adds or modifies a change folder from a differently named branch fails, and archive keeps the change name so the binding survives archiving.

## Impact

- `openspec/config.yaml`: `context`, `rules.proposal`, `operations.apply.guidance`, `operations.archive.guidance`
- Deleted: `.agents/skills/gh-change-start/`, `.agents/skills/gh-change-ship/`, `.agents/skills/gh-issue-draft/` (including its `issue-template.md`)
- `AGENTS.md`, `README.md`
- New: `scripts/change-guard.mjs` and its test, `.github/workflows/change-guard.yml`
- No runtime code and no product capability changes; web, assistant, whatsapp-bridge and wichteln are untouched.
