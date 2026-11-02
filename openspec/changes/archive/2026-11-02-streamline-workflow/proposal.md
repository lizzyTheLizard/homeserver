# Proposal

## Why

The OpenSpec workflow is too step-by-step:

- `openspec-apply-change` stops after every task for a review and makes one commit per task.
- `openspec-archive-change` leaves the spec sync and the PR follow-up to the user.

The dev-machine also runs every Remote Control session in the same `/home/dev/workspace` checkout. Two sessions working on two changes switch branches under each other, which breaks the rule that a change is only worked on while its own branch is checked out.

## What Changes

- **Apply**: implement all tasks of the change in one go, without stopping between tasks. When every task is ticked, show the user the full diff for one review. Only after the user approves, commit and push. The change gets one commit with the existing message format and trailers (`OpenSpec-Change:`, `Agent:`), not one commit per task.
- **Archive**: sync the delta specs into `openspec/specs/` automatically, without asking. Then commit the archive, push it and open the PR with auto-merge armed, as before. Then follow the PR until its checks are green and it has merged.
  - If a check fails or the PR cannot merge, investigate it and fix it in the working tree automatically.
  - Never commit or push such a fix without first showing the diff and getting the user's review.
- **Dev-machine**: the Remote Control server spawns each new session in its own git worktree (`--spawn worktree`) instead of the shared checkout (`--spawn same-dir`). Parallel sessions then have their own working directory and branch.
  - Worktrees get the gitignored `services/.env` copied in, so dev scripts keep working.
  - The worktree folder is gitignored.
- The workflow docs (`README.md`, `CLAUDE.md`) describe the new apply and archive behaviour.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `dev-machine`: the Remote Control requirement changes from "sessions start in the repository checkout" to "each session gets its own worktree of the repository".

The OpenSpec workflow rules live in `openspec/config.yaml` and have no spec capability. Changing them is configuration, not a spec-level behaviour change.

## Impact

- `openspec/config.yaml`: `operations.apply.guidance` and `operations.archive.guidance`
- `README.md`, `CLAUDE.md`: workflow description
- `services/dev-machine/supervisord.conf`: `claude-remote-control` command
- `.gitignore`, new `.worktreeinclude`: worktree hygiene
- Deploy: merging rebuilds and redeploys the dev-machine, which restarts the Remote Control server and ends any running sessions.
- This reverses the `same-dir` choice of `fix-deploy-and-remote-control`. That change replaced `--spawn session`, which was broken; `worktree` mode was not tried then.
