---
name: create-issue
description: This skill should be used when the user asks to "create an issue", "open a GitHub issue", "add a ticket", "create a feature request", "log a bug in GitHub", or wants to capture a task, bug, or idea as a GitHub issue. Gathers requirements, creates the issue, and connects it to the Homeserver project with the correct status, milestone, and labels.
---

# Create GitHub Issue

Guide the user from a rough idea to a well-structured GitHub issue, then create it with proper project linkage.

## Project Constants

- **Project owner:** lizzyTheLizard
- **Project number:** 1
- **Project title:** Homeserver
- **Status field ID:** `PVTSSF_lAHOANavlM4BbECkzhV3Oko`
  - Planning: `ff6aa981`
  - UI: `a1c8739f`
  - Todo: `f75ad846`
  - In Progress: `47fc9ee4`
  - Done: `98236657`

## Workflow

### Step 1: Get the initial idea

Ask the user to describe what they want to achieve or what problem they want to solve. One open question is enough — do not ask multiple questions at once:

> "What would you like this issue to cover? Describe the goal or problem in your own words."

### Step 2: Ask clarifying questions

Identify gaps in understanding before drafting anything. Cover the following areas — skip any that are already clear:

- **Who benefits?** Who is the user/role this is for? (needed for the User Story)
- **What is the success condition?** How do we know when this is done? (needed for acceptance criteria)
- **Scope / edge cases** — are there known constraints, error cases, or out-of-scope items?
- **UI / design needed?** Does this feature require a new screen, form, or visual design? Check the `design/` folder to see if a design already exists.
- **Technical constraints** — relevant architecture decisions, dependencies, or implementation notes.
- **Priority / milestone** — which milestone does this belong to? (available: "Personal Assistant", "Cash improvements", "New CoEditor")
- **Labels** — which labels apply? (e.g. `StartPage`, `Cash`, `CoEditor`, `improvement`, `enhancement`, `bug`)

Stop asking questions once there is enough information to write a complete, unambiguous issue.

### Step 3: Determine the initial status

Based on the gathered information, decide the initial project status:

- **Planning** — if any information is unclear, incomplete, or needs refinement later. (Default for most new issues.)
- **UI** — if a UI design is needed first, and the business requirements are clear enough for a designer to start.
- **Todo** — only if the issue is fully refined, has a design ready (or no UI involved), and is ready for immediate implementation.

### Step 4: Draft the issue for review

Present a draft to the user before creating the issue. Format it using `issue-template.md` (in this skill folder) and ask the user to confirm or request changes. Do not create the issue until the user approves the draft.

### Step 5: Create the issue

Once the user approves the draft, create the issue using the `gh` CLI:

```bash
gh issue create --title "<title>" --label "<label1,label2>" --milestone "<milestone>" --body "$(cat <<'EOF'
<formatted body>
EOF
)"
```

Always use a HEREDOC to pass the body so that newlines and special characters are preserved correctly.

### Step 6: Link to the project and set status

Add the issue to the Homeserver project:

```bash
gh project item-add 1 --owner lizzyTheLizard --url "<issue-url>"
```

This returns an item ID. Then set the status field:

```bash
gh project item-edit 1 --owner lizzyTheLizard --item-id "<item-id>" --field-id PVTSSF_lAHOANavlM4BbECkzhV3Oko --single-select-option-id "<status-option-id>"
```

### Step 7: Report

Report the issue URL back to the user when done.

## Guidelines

- Keep the User Story to 2–3 sentences. Avoid implementation details there — save those for Additional Information.
- Acceptance criteria must be testable and written as observable outcomes ("the user can…", "the system returns…"), not implementation steps. Keep them to 3-5 max.
- If a UI design is needed, say so explicitly in the UI / Design Requirements section so it is not overlooked. If a design already exists in `design/`, include a link to it.
- Omit empty sections from the final issue body — do not leave placeholder comments in the posted issue.
- This skill creates the issue and links it to the project. It does NOT refine the issue further — use `refine-issue` for that.
