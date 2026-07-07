---
name: refine-issue
description: Takes an existing issue in "Planning" phase and refines it. Asks clarifying questions, updates the issue body, and transitions the status to "UI" or "Todo" when ready.
---

# Refine GitHub Issue

Takes an issue that is in the "Planning" status and refines it — fill gaps, resolve open questions, and transition it to the next stage.

## Project Constants

- **Project owner:** lizzyTheLizard
- **Project number:** 1
- **Status field ID:** `PVTSSF_lAHOANavlM4BbECkzhV3Oko`
  - Planning: `ff6aa981`
  - UI: `a1c8739f`
  - Todo: `f75ad846`

## Workflow

### Step 1: Select or confirm the issue

If the user has already specified an issue number, use that. Otherwise, list open issues in the project and filter for "Planning" status:

```bash
gh project item-list 1 --owner lizzyTheLizard --format json
```

Cross-reference the returned item IDs with issue numbers (check `content` field). Show the user the list of Planning-status issues and let them pick one.

Fetch the full issue details:

```bash
gh issue view <NUMBER> --json number,title,body,labels,comments,milestone
```

### Step 2: Verify the issue is in "Planning" status

Check the project item status by reading the issue context. If the issue is not in "Planning", explain that this skill only works for Planning-phase issues and terminate.

### Step 3: Gather information and ask clarifying questions

Read the issue body and any existing comments. Identify gaps covering:

- **User Story** — is the role, action, and benefit clear?
- **Acceptance Criteria** — are there testable conditions? Are edge cases covered?
- **Scope** — is it clear what is in and out of scope?
- **UI / design needed?** — does this require visual design? If yes, check `design/` for existing designs.
- **Technical notes** — are there known constraints or dependencies?
- **Labels** — are the correct labels applied? (e.g. `StartPage`, `Cash`, `CoEditor`, `improvement`, `enhancement`, `bug`)
- **Milestone** — is the milestone set appropriately?

Ask questions one at a time. Stop once the issue can be unambiguously understood and implemented.

### Step 4: Draft the issue for review

Present a draft of the updated issue to the user before updating it. Format it using `issue-template.md` (in this skill folder) and ask the user to confirm or request changes. Do not update the issue until the user approves the draft.


### Step 5: Draft the issue for review

Present a draft to the user before updating the issue. Format it using `issue-template.md` (in this skill folder) and ask the user to confirm or request changes. If the user request changes, update the draft, show the full draft to the user and ask for confirmation again. Repeat until the user approves the draft without changes. Do not continue until the user explicitely approves the draft.


### Step 6: Update the issue body

```bash
gh issue edit <NUMBER> --body "$(cat <<'EOF'
<updated body>
EOF
)"
```

### Step 6: Determine the next status

- **UI** — if the issue needs a UI design before implementation can start, and the business requirements are clear enough
- **Todo** — if no UI design is needed (or a design already exists) and the issue is ready for implementation
- **Stay in Planning** — if significant gaps remain that cannot be resolved now

### Step 7: Transition the project status

First get the project item ID for this issue:

```bash
# Cross-reference the issue number in the project to find the item ID
gh project item-list 1 --owner lizzyTheLizard --format json
```

Then set the new status:

```bash
gh project item-edit 1 --owner lizzyTheLizard --item-id "<item-id>" --field-id PVTSSF_lAHOANavlM4BbECkzhV3Oko --single-select-option-id "<new-status-option-id>"
```

### Step 8: Check Labels and Milestone

Check if the issue has the correct labels and milestone. If not, update them. Ask the user if the labels and milestone are correct, and if not, what they should be. Then run:

```bash
gh issue edit <NUMBER> --label "<label1,label2>" --milestone "<milestone>"
``` 


### Step 9: Report

Tell the user the issue has been refined and what status it now has. If it transitioned to "Todo", suggest they can use `start-implementing` to begin work.
