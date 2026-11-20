# Tasks

## 1. Workflow

- [ ] 1.1 Create `.github/workflows/dependabot-update-branch.yml` triggered by `push` to `main` and `workflow_dispatch`, with `contents: read` permissions and a `concurrency` group; verify with `actionlint` (or by reading the file) that it parses.
- [ ] 1.2 Add a step that creates the app token like `dependabot-auto-merge.yml` and verify the same secrets and permissions are used.
- [ ] 1.3 Add a step that lists open Dependabot pull requests with `gh pr list --json`, exits without action when an up-to-date pull request with armed auto-merge and no failed check exists, and otherwise runs `gh pr update-branch` on the oldest eligible behind pull request; verify the selection logic by running it against the repository with the update command replaced by `echo`.

## 2. Specs and verification

- [ ] 2.1 Verify `openspec validate update-behind-dependabot-prs --strict` passes.
- [ ] 2.2 After merge, run the workflow by hand with `gh workflow run` and verify one behind Dependabot pull request is updated and the chain continues after it merges.

## Workflow follow-up

- Archive the change after the diff is reviewed.
