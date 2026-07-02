---
name: implementation-finish
description: Finishes the implementation of an issue. Runs all checks (lint, test, build, Chromatic), verifies completeness, creates a PR, and auto-merges when green.
---

# Implementation Finish

Finalizes an implementation: runs quality checks, verifies completeness, creates a PR, and auto-merges.

## Project Constants

- **Project owner:** lizzyTheLizard
- **Project number:** 1
- **Status field ID:** `PVTSSF_lAHOANavlM4BbECkzhV3Oko`
  - In Progress: `47fc9ee4`
  - Done: `98236657`

## Workflow

### Step 1: Verify workspace context

Check that we are on a branch matching `issue-#<NUMBER>-*`. Extract the issue number:

```bash
git rev-parse --abbrev-ref HEAD
```

If not on a matching branch, stop and explain.

### Step 2: Fetch the issue details

```bash
gh issue view <NUMBER> --json number,title,body,labels,comments,milestone
```

### Step 3: Verify all tasks are complete

Parse the issue body for unchecked task list items (`- [ ]`). If any remain, show them to the user and ask if they want to:
- Mark them as intentionally skipped (and update the issue)
- Come back after implementing them

Only proceed once all tasks are resolved.

### Step 4: Run full checks

Run all checks in order. Fix any issues before proceeding:

**4a. Lint:**
```bash
pnpm lint
```

**4b. Tests:**
```bash
pnpm test
```

**4c. Build:**
```bash
pnpm build
```

**4d. Chromatic (if UI changes):**
```bash
pnpm chromatic
```
Review visual diffs with the user and confirm they are intentional.

### Step 5: Check for stray TODOs

Search for leftover markers in changed files:

```bash
git diff --name-only origin/main...HEAD | ForEach-Object { if ($_) { Select-String -Path $_ -Pattern "(TODO|FIXME|HACK|XXX)" } }
```

If any are found, show them to the user and ask how to handle them.

### Step 6: Architecture and scope review

Review the changes against the project conventions from `AGENTS.md`. Flag any concerns to the user.

### Step 7: Check documentation

Check if `AGENTS.md` or `README.md` needs updating:
- Were new patterns, conventions, or configuration introduced?
- Were new environment variables or dependencies added?

If so, ask the user if documentation should be updated and do it.


### Step 9: Create the Pull Request

```bash
gh pr create --title "<short title> (#<NUMBER>)" --body "$(cat <<'EOF'
## Summary

<2–4 bullets describing what was done>

Closes #<NUMBER>
EOF
)" --assignee "@me"
```

**PR rules:**
- Title is short and clear, with the issue number in parentheses
- Body uses `Closes #<NUMBER>` so GitHub auto-closes the issue on merge
- Keep the body concise — the issue already contains the full context

### Step 10: Wait for PR checks and auto-merge

Report the PR URL. Enable auto-merge:

```bash
gh pr merge --auto --squash "<NUMBER>"
```

Monitor the PR status until all checks pass. If checks fail, investigate, fix with new commits, and push until green.

If merge conflicts arise, resolve them:

```bash
git fetch origin
git rebase origin/main
# resolve conflicts
git push --force-with-lease
```

### Step 11: Final update

Once the PR is merged, report that to the user
