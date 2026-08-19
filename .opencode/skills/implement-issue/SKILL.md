---
name: implement-issue
description: Implements code changes for an issue that is in "Todo" status. Auto-generates a change list from the issue body, implements selected items, commits, and updates the issue. Can be called multiple times for the same issue.
---

# Implement Issue

Implements code changes for an issue in "Todo" status. Shows the user a list of changes derived from the issue, implements selected items, commits, and updates progress.

## Project Constants

- **Project owner:** lizzyTheLizard
- **Project number:** 1
- **Status field ID:** `PVTSSF_lAHOANavlM4BbECkzhV3Oko`
  - Todo: `f75ad846`
  - In Progress: `47fc9ee4`
  - Done: `98236657`

## Workflow

### Step 1: Verify workspace context

Check that we are on a branch matching `issue-#<NUMBER>-*`. Extract the issue number:

```bash
git rev-parse --abbrev-ref HEAD
```

If not on a matching branch, suggest running `start-implementing` first.

### Step 2: Fetch the issue details

```bash
gh issue view <NUMBER> --json number,title,body,labels,comments
```

### Step 3: Verify the issue is in "In Progress" status

Check the issue's project status. If not in "In Progress":
- If in "Planning" → suggest `refine-issue`
- If in "UI" → suggest `implement-ui-design`
- If in "Todo" → suggest `start-implementing` to create a branch and start implementation
- If in "Done" → nothing to do

### Step 4: Auto-generate change list from the issue
If the user defined what to implement, go directely to step 6. Otherwise parse the issue body to extract:
- **Acceptance Criteria** — each `- [ ]` item is a potential task
- **Technical Notes** — files to modify or create
- **UI / Design Requirements** — reference to `design/` files
- **Task lists** in the body or comments

Derive a structured change list. Examples:
- Create a new database migration file: `db/<description>.sql`
- Add a new server action in `app/<page>/server.ts`
- Create a new component: `app/<page>/_components/<name>.tsx`
- Add tests: `<file>.tests.ts`, `<file>.server.tests.ts`
- Add Storybook stories: `<file>.stories.ts`

### Step 5: Present the change list to the user

Show the derived list and let the user select which items to implement now (one, several, or all).

Remind the user: this skill can be called multiple times. If there are many changes, select a subset for this session.

### Step 6: Implement the selected changes

Implement the changes following the project conventions from `AGENTS.md`

### Step 7: User review

Ask the user to review the changes. Do not commit until the user approves.

### Step 8: Pre-commit checks

Before committing, run:

```bash
pnpm lint
```

```bash
pnpm vitest run <affected-test-files>
```

Report any issues and a potential fix to the user. Do NOT change files in this step without explicit user acceptance as the user has already performed its code review. Do NOT revert changes to files done in the code review

### Step 9: Commit and push

When the user approves and checks pass:

```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
<short imperative message> (#<NUMBER>)

Co-Authored-By: opencode <noreply@opencode.ai>
EOF
)"
git push
```

**Message rules:**
- Imperative mood, present tense ("Add", "Fix", "Wire up" — not "Added" or "Adding")
- Under 72 characters for the subject line
- Reference the issue number in parentheses at the end: `(#NUMBER)`

### Step 10: Update the issue

Add a comment describing what was implemented:

```bash
gh issue comment <NUMBER> --body "## Implementation Progress

Completed:
- [task description]
- [task description]

[Additional implementation notes]"
```

Update the issue body to check off completed tasks if the body contained task lists.

### Step 11: Check completeness

Check if all tasks and acceptance criteria appear to be done:
- If all done → ask the user: "All tasks appear complete. Would you like to finish the implementation? This will run final checks and create a PR." If yes, trigger `implementation-finish`.
- If more remain → report: "X tasks remain. You can continue implementation or use `implementation-finish` when all tasks are done."
