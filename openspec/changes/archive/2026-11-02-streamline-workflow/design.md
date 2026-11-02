# Design

## Context

The OpenSpec skills in `.claude/skills/` are generated and must not be edited. The project shapes them only through `openspec/config.yaml`: `context`, `rules` and `operations.<phase>.guidance`. Today the `apply` guidance asks for review and a commit per task, and the `archive` guidance stops at "watch the checks".

The dev-machine starts `claude remote-control --spawn same-dir` under supervisord, in `/home/dev/workspace`. The CLI supports `--spawn worktree`. Its `--create-session-in-dir` option is on by default and keeps one pre-created session in the current directory, while sessions started on demand get isolated worktrees.

## Goals / Non-Goals

**Goals:**
- Express the new apply and archive behaviour purely as `config.yaml` guidance.
- Give every Remote Control session its own worktree that works out of the box.

**Non-Goals:**
- Editing the generated `openspec-*` skills or regenerating them.
- Changing the change guard or the pipeline. The archive PR shape stays the same.
- Changing propose. It still creates the branch and commits the plan.
- Sharing `node_modules` between worktrees. Each worktree runs `pnpm install`, which the shared pnpm store makes cheap.

## Decisions

**Apply: one review and one commit at the end.**
- The guidance says to implement every task in order and tick each checkbox. It must not pause for review between tasks.
- After the last task, run lint and tests for the affected packages, then show the whole diff.
- Commit and push only after the user approves. The change gets a single commit with the existing message format and trailers.
- If the user asks for changes, apply them and show the diff again before committing.
- The rule not to archive yourself stays.
- Alternative considered: keep per-task commits but skip the pauses. Rejected, because the user explicitly wants no per-task commits.

**Archive: sync without asking, then shepherd the PR.**
- The stock archive skill offers the spec sync as a choice. The guidance tells it to always sync before archiving.
- The archive commit, the push, the PR body and `gh pr merge --auto --squash` stay as they are.
- Then follow the PR until it has merged, using `gh pr checks --watch` and `gh pr view --json state`.
- On a failing check, read the job log and fix the cause in the working tree. Then stop: show the diff, and commit and push only after the user approves. After that, keep watching the PR.
- The archive commit and its push need no extra review, because they hold only already-reviewed content plus the mechanical archive move.
- This rule follows the user's wording: "do NOT commit or push without asking" applies to fixes, not to the archive step itself.

**Worktrees: `--spawn worktree` with the default `--create-session-in-dir`.**
- The pre-created session stays in `/home/dev/workspace`, so the main checkout is still reachable. Every new session gets its own worktree.
- Claude Code places worktrees under `.claude/worktrees/` in the repository. Add that path to `.gitignore`.
- Add a `.worktreeinclude` listing `services/.env`, so Claude Code copies the gitignored env file into each new worktree.
- Alternative considered: `--no-create-session-in-dir`. Rejected, because it leaves no session on the main checkout for quick looks.
- Alternative considered: a custom worktree hook. Rejected, because `.worktreeinclude` already covers the only untracked file needed.

## Risks / Trade-offs

- [The single end-of-apply review produces a large diff] → The tasks stay grouped and ticked, so the review can follow `tasks.md` group by group.
- [An auto-fix loop on a flaky check] → The guidance limits fixing to failures with a clear cause. If a check fails without one, it re-runs the check once and otherwise reports to the user.
- [Stale worktrees accumulate on the dev-machine volume] → Claude Code removes clean worktrees when a session ends. Leftovers can be cleaned up with `git worktree prune`. This is documented in the README.
- [The redeploy of the dev-machine ends running sessions] → Merge when no session is active, same as for any dev-machine change.

## Migration Plan

Merging to `main` redeploys the dev-machine with the new command. Rollback means reverting the commit, which restores `--spawn same-dir`. The `config.yaml` guidance takes effect on the next workflow run, with no migration.
