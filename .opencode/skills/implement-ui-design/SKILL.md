---
name: implement-ui-design
description: Implements UI design changes for an issue that is in "UI" status. Only modifies files in the design/ folder. After the design is done, transitions the issue to "Todo" status.
---

# Implement UI Design

Implements UI design changes for an issue that requires visual design work. Only modifies files in the `design/` folder.

## Project Constants

- **Project owner:** lizzyTheLizard
- **Project number:** 1
- **Status field ID:** `PVTSSF_lAHOANavlM4BbECkzhV3Oko`
  - UI: `a1c8739f`
  - Todo: `f75ad846`

## Workflow

### Step 1: Verify workspace context

Check that we are on a branch matching the pattern `issue-#<NUMBER>-*`. Extract the issue number from the branch name:

```bash
git rev-parse --abbrev-ref HEAD
```

If not on a matching branch, explain that this skill requires a feature branch created by `start-implementing`.

### Step 2: Fetch the issue details

```bash
gh issue view <NUMBER> --json number,title,body,labels,comments
```

### Step 3: Verify the issue is in "UI" status

Check the issue's project status. If it is not in "UI", explain the requirement:
- If in "Planning" → suggest `refine-issue`
- If in "Todo" → suggest `implement-issue` (already implemented)
- If already done → nothing to do

### Step 4: Extract design requirements and show change list

Read the issue body and comments for UI/design requirements. Also read the issue title.

Auto-generate a list of UI changes needed based on the issue description. Examples:
- Create a new HTML mockup for [screen name]
- Update the [component] design with new states
- Update the design canvas with new section
- Create mobile/desktop variants

**Show the list to the user** and let them select which changes to implement now (one, several, or all).

### Step 5: Implement the selected changes

Implement the selected UI changes. **Only modify files inside the `design/` folder.** This includes:
- HTML mockup files (`*.html`)
- JSX design component files (`*.jsx`)
- Canvas state (`design-canvas.state.json`)
- Upload assets to `design/uploads/`

### Step 6: User review

Ask the user to review the changes. Do not commit until the user approves.

### Step 7: Commit and push

When the user approves:

```bash
git add design/
git commit -m "$(cat <<'EOF'
<short imperative message> (#<NUMBER>)

Co-Authored-By: opencode <noreply@opencode.ai>
EOF
)"
git push
```

### Step 8: Update the issue

Add a comment describing what was designed and linking to the design files:

```bash
gh issue comment <NUMBER> --body "## UI Design Complete

The following designs were created/updated:
- [design/<file1>](design/<file1>)
- [design/<file2>](design/<file2>)

Status transitioned: UI → Todo"
```

### Step 9: Transition the issue status if needed

Check if all design work appears to be done:
- If all done → ask the user: "All UI appear complete. Would you like to finish the design?" If yes, transition the issue to "Todo" and tell the user that the issue is now ready for implementation via `implement-issue`.
- If more remain → report: "X design tasks remain. You can continue implementation with `implement-ui-design` or use `implement-issue` when all design work is done."
