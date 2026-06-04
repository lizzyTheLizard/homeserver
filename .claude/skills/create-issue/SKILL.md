---
name: create-issue
description: This skill should be used when the user asks to "create an issue", "open a GitHub issue", "add a ticket", "create a feature request", "log a bug in GitHub", or wants to capture a task, bug, or idea as a GitHub issue. Handles the full flow from gathering requirements through asking clarifying questions to creating the formatted issue.
version: 0.1.0
---

# Create GitHub Issue

Guide the user from a rough idea to a well-structured GitHub issue, asking clarifying questions as needed before creating the issue.

## Mode

This skill always runs in edit mode — it does not require a planning phase.

If plan mode is currently active when this skill is invoked:
1. Write the single line "No planning phase — create-issue runs interactively in edit mode." to the plan file.
2. Call `ExitPlanMode` immediately.
3. Then proceed with Step 1 of the workflow below.

## Workflow

### Step 1: Get the initial idea

Ask the user to describe what they want to achieve or what problem they want to solve. One open question is enough — do not ask multiple questions at once:

> "What would you like this issue to cover? Describe the goal or problem in your own words."

### Step 2: Ask clarifying questions

Identify gaps in understanding before drafting anything. Ask one question at a time and wait for the answer. Cover the following areas — skip any that are already clear from the user's description:

- **Who benefits?** Who is the user/role this is for? (needed for the User Story)
- **What is the success condition?** How do we know when this is done? (needed for acceptance criteria)
- **Scope / edge cases** — are there known constraints, error cases, or out-of-scope items?
- **UI / design needed?** Does this feature require a new screen, form, or visual design? If yes, capture the design requirements.
- **Technical constraints** — relevant architecture decisions, dependencies, or implementation notes the developer should know.
- **Priority / context** — is there a deadline or dependency on another issue?

Stop asking questions once there is enough information to write a complete, unambiguous issue. Do not ask for information that is already clear.

### Step 3: Draft the issue for review

Present a draft to the user before creating the issue. Format it using `issue-template.md` (in this skill folder) and ask the user to confirm or request changes.

### Step 4: Create the issue

Once the user approves the draft, create the issue using the `gh` CLI:

```bash
gh issue create --title "<title>" --body "$(cat <<'EOF'
<formatted body>
EOF
)"
```

Always use a HEREDOC to pass the body so that newlines and special characters are preserved correctly.

Report the issue URL back to the user when done.

## Guidelines

- Keep the User Story to 2–3 sentences. Avoid implementation details there — save those for Additional Information.
- Acceptance criteria must be testable and written as observable outcomes ("the user can…", "the system returns…"), not implementation steps.
- If a UI design is needed, say so explicitly in the UI / Design Requirements section so it is not overlooked.
- Omit empty sections from the final issue body — do not leave placeholder comments in the posted issue.
