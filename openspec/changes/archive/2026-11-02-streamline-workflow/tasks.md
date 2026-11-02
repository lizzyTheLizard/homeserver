# Tasks

## 1. Apply workflow

- [x] 1.1 Rewrite `operations.apply.guidance` in `openspec/config.yaml`:
  - Implement all tasks without pausing and tick each one.
  - Then run lint and tests for the affected packages and show the full diff.
  - Commit and push once, only after the user approves, with the `OpenSpec-Change:` and `Agent:` trailers and no issue number.
  - Never archive yourself.
  - Verify that `openspec instructions apply --change streamline-workflow --json` prints the new guidance.
- [x] 1.2 Update the Implement row and the contract paragraph of the README's "Development workflow" section, and the workflow line in `CLAUDE.md`. Verify that neither file still mentions "one task at a time" or per-task commits.

## 2. Archive workflow

- [x] 2.1 Rewrite `operations.archive.guidance` in `openspec/config.yaml`:
  - Always sync the delta specs before archiving, without asking.
  - Keep the archive commit and push, the PR body and auto-merge as they are.
  - Then follow the PR with `gh pr checks --watch` and `gh pr view` until it has merged.
  - On a failure, fix it in the working tree, show the diff and commit and push only after the user approves.
  - On a check that fails with no clear cause, re-run it once, then report.
  - Verify that `openspec instructions archive --change streamline-workflow --json` prints the new guidance.
- [x] 2.2 Update the Ship row in `README.md` and the archive step in `CLAUDE.md` to name the automatic spec sync and the PR follow-up until merge. Verify by reading both sections.

## 3. Worktree per Remote Control session

- [x] 3.1 Change the `claude-remote-control` command in `services/dev-machine/supervisord.conf` to `claude remote-control --spawn worktree`. Verify with `grep spawn services/dev-machine/supervisord.conf`.
- [x] 3.2 Add `.claude/worktrees/` to `.gitignore` and create `.worktreeinclude` with `services/.env`. Verify that `git check-ignore .claude/worktrees/x` matches.
- [x] 3.3 In the README dev-machine section, document worktree-per-session, the copied `.env`, the need for `pnpm install` per worktree and `git worktree prune` for cleanup. Update the dev-machine bullet in `CLAUDE.md`. Verify by reading both.
- [x] 3.4 Check that worktree mode works without running the service:
  - Run `claude remote-control --help` and confirm `worktree` is a valid `--spawn` mode.
  - Run `openspec validate streamline-workflow` and confirm it passes.

## Workflow follow-up

- After merge, the dev-machine redeploys. Start a new Remote Control session and check that it runs in a worktree under `.claude/worktrees/` with `services/.env` present.
