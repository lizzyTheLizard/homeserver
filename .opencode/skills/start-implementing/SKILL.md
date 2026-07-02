---
name: start-implementing
description: Starts the implementation of an issue. The issue must be in "Todo" or "UI" status. Creates a branch from latest main, pushes it, and prepares the workspace.
---

# Start Implementing

Prepares everything needed to begin implementing an issue: validates the issue state, creates a branch from latest main, and pushes it.

## Project Constants

- **Project owner:** lizzyTheLizard
- **Project number:** 1
- **Status field ID:** `PVTSSF_lAHOANavlM4BbECkzhV3Oko`
  - Todo: `f75ad846`
  - UI: `a1c8739f`

## Workflow

### Step 0: Verify you are in an OpenCode workspace

Check that the current directory is inside an OpenCode worktree (not a raw git clone):

```bash
$worktreeRoot = "$env:USERPROFILE\.local\share\opencode\worktree"
$currentPath = (Get-Location).Path
$isOpenCodeWorkspace = $currentPath.StartsWith($worktreeRoot, [StringComparison]::OrdinalIgnoreCase)
if (-not $isOpenCodeWorkspace) { Write-Host "Not in an OpenCode workspace" }
```

If the check fails, tell the user they must create an OpenCode workspace first by running `opencode` in this directory or using the OpenCode CLI to create a workspace. The skill cannot proceed outside an OpenCode workspace.

### Step 1: Select or confirm the issue

If the user has already specified an issue number, use that. Otherwise, list open issues in "Todo" or "UI" status and ask the user to pick one.

Fetch the full issue details:

```bash
gh issue view <NUMBER> --json number,title,body,labels,state
```

### Step 2: Verify the issue status

Check that the issue is in "Todo" or "UI" status on the Homeserver project. If not, explain which status is required and suggest the appropriate skill (e.g. `refine-issue` if still in "Planning").

### Step 3: Check for uncommitted changes

```bash
git status --porcelain
```

If there are uncommitted changes, stop and ask the user how to handle them (stash, commit, or discard) before proceeding.

### Step 4: Prepare the branch

```bash
git checkout main
git pull origin main
```

Generate the branch name from the issue title: `issue-#<NUMBER>-<kebab-case-title>` (lowercase, no special characters).

Create the branch:

```bash
git checkout -b issue-#<NUMBER>-<kebab-title>
```

### Step 5: Push the branch

```bash
git push -u origin HEAD
```

Optionally create an empty initial commit to mark the start of work:

```bash
git commit --allow-empty -m "chore: start work on #<NUMBER>"
git push
```

### Step 6: Report

Tell the user:
- The branch name and that it's based on the latest origin/main
- The issue number and title
- That the workspace is ready for implementation
- Suggest which skill to use next (`implement-ui-design` if in "UI" status, or `implement-issue` if in "Todo" status)
