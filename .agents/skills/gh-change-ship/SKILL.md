---
name: gh-change-ship
description: Finish a change whose tasks are all done - archive the change, open the pull request, arm auto-merge, then watch CI and fix failures until it merges. Use when the user says to ship, open the PR, or finish the change.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(openspec:*), Bash(pnpm:*), Read, Write, Edit
license: MIT
metadata:
  author: gh-spec-flow
  version: "1.0"
---

Get a finished change branch merged.

**Precondition**: on an `issue-<n>-<slug>` branch, all tasks in `tasks.md`
checked off and committed. If tasks remain, go back to `/openspec-apply-change`
instead.

Throughout, `<change>` is the change name and `<n>` the issue number. Both come
from the branch: it is `issue-<n>-<slug>`, and the change name equals the branch
name.

## Steps

1. **Confirm where you are.**

   ```bash
   git branch --show-current
   openspec status --change "<change>" --json
   git status --short
   ```

   The branch must be `issue-<n>-<slug>` and the change name must equal the
   branch name. Unchecked tasks or an unclean tree means this skill is
   premature — say so and stop.

2. **Run full checks.** Run all checks in order and fix any issues before
   proceeding. Do not commit or push anything yet.
   - Lint: `pnpm lint`
   - Test: `pnpm test`
   - Build: `pnpm build`
   - Chromatic (only if the change touches UI): `pnpm --filter @homeserver/web chromatic`,
     then review the visual diffs with the user and confirm they are intentional.

3. **Check for stray TODOs.** Search for leftover markers in the changed files:

   ```bash
   git grep -nE "(TODO|FIXME|HACK|XXX)" -- $(git diff --name-only --diff-filter=ACM origin/main...HEAD)
   ```

   `--diff-filter=ACM` keeps only added/copied/modified files, so deleted files
   don't trip the pathspec. A non-zero exit simply means no matches. If any are
   found, show them to the user and ask how to handle them.

4. **Perform an architecture and scope review.** Review the changes against the
   conventions in `AGENTS.md`. Flag any concerns to the user.

5. **Check and update documentation.** Check whether `AGENTS.md` or `README.md`
   needs updating:
   - Were new patterns, conventions, or configuration introduced?
   - Were new environment variables or dependencies added?

   If so, ask the user whether documentation should be updated and then do it.
   Do not commit yet.

6. **Review changes and commit.** Show the user a list of all changed files from
   steps 2–5 and ask them to review. If the user wants more changes, make them
   (or let the user make them) and repeat steps 2–5 until they approve. Only
   then commit and push, using the standard message format (substitute the real
   values):

   ```bash
   git add <relevant files>
   git commit -m "<short imperative message> (#<n>)" -m "OpenSpec-Change: <change>
   Agent: deepseek-harness"
   git push
   ```

7. **Archive the change.** Run the stock workflow:

   ```
   /openspec-archive-change <change>
   ```

   This syncs the change's delta specs into the main
   `openspec/specs/<capability-path>/spec.md` files and moves the change folder
   to `openspec/changes/archive/`. When the archive workflow asks, choose to
   sync now (the default) so the main specs reflect the change.

8. **Review the archive with the user**, then commit it:
   - Show them the `openspec/` diff before committing — the synced
     `openspec/specs/` files plus the change folder moved to
     `openspec/changes/archive/`. This defines what the system is documented to
     do from now on — it deserves a real look, not a rubber stamp.
   - Make sure no other files are staged. If they are, warn the user and stop —
     the archive commit must be isolated to `openspec/` only.
   - Commit and push using the standard message format:

   ```bash
   git add -A openspec
   git commit -m "Archive <change> (#<n>)" -m "OpenSpec-Change: <change>
   Agent: deepseek-harness"
   git push
   ```

9. **Open the pull request.** Write the body to a scratch file, then file the
   PR:

   ```bash
   gh pr create --title "<short title> (#<n>)" --body-file <path> --assignee "@me"
   ```

   The body is short: a `## Summary` heading, 2–4 bullets describing what was
   done, and a `Closes #<n>` line so GitHub auto-closes the issue on merge.

   **PR rules:**
   - Title is short and clear, with the issue number in parentheses.
   - Keep the body concise — the issue already contains the full context.

10. **Wait for PR checks and auto-merge.** Report the PR URL, then enable
    auto-merge:

    ```bash
    gh pr merge --auto --squash
    ```

    Monitor the PR until all checks pass. If checks fail, investigate, fix with
    new commits, and push until green. After any change, go through steps 2–6
    again to ensure the change is still valid and complete.

11. **Wrap up.** Once the PR merges, report it to the user.

## Guardrails

- Never commit a CI fix without showing the user the diff first — the same
  review rule as any other task.
- If a CI failure means the specs or tasks were wrong rather than the code, stop
  and say so: that is `/openspec-update-change` (then re-archive), not a patch
  on the way to green.
- Do not force-push, and do not rewrite commits the user already reviewed.
