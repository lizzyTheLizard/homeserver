---
name: implement-issue
description: Use this skill when the user wants to implement a GitHub issue. Guides the full flow from selecting an issue, gathering designs and information, creating an implementation plan, branching, working, and finally committing/pushing and opening a PR.
version: 0.1.0
---

# Implement GitHub Issue

Guide the user from selecting a GitHub issue through implementation, commit, and PR — in a structured, checklist-driven flow.

## Mode

This skill uses plan mode to gate implementation.

- **At the very start**, call `EnterPlanMode` before doing anything else.
- Steps 0–3 (ongoing-check, issue selection, design check, clarifying questions) run inside plan mode.
- **Step 4** ends plan mode: write the implementation plan to the plan file (path provided in the plan mode system message), then call `ExitPlanMode`. The user's approval of the plan is the gate between planning and coding. Do **not** ask the user via text whether the plan looks correct — the plan approval flow handles that.
- Steps 5–8 (branch, implement, pre-commit checks, commit, PR) run after the user has approved the plan, outside plan mode.

## Workflow

### Step 0: Check if this is an ongoing implementation

If the current branch is already in the form issue-#NUMBER-short-title-with-dashes, ask if you should continue with the implementation of this issue. If so, go directly to step 6.

### Step 1: Select the issue

If the user has not already specified an issue number, list open issues so they can pick one:

```bash
gh issue list --state open
```

Ask the user which issue they want to work on if it is not already clear.

Once an issue is identified, fetch its full details:

```bash
gh issue view <NUMBER> --json number,title,body,labels,comments
```

Read and summarise the issue for the user: title, user story, acceptance criteria, and any technical notes.

### Step 2: Check whether UI / design work is involved

Read the issue body and labels. If the issue involves UI changes, new screens, or visual components:

- Ask the user: "This issue involves UI changes. Do you have a design ready? If so, please share it via Claude Designer."
- If no design is available yet, pause and tell the user the issue cannot be fully planned without the design. Only continue once one is provided.

If the issue is purely backend / data / configuration with no UI surface, skip this step.

### Step 3: Gather all information and ask clarifying questions

Before writing the plan, make sure every question is answered. Ask **one question at a time** and wait for the answer. Cover only what is not already clear from the issue or design:

- Are there related issues, dependencies, or blocked work?
- Are there open questions in the issue comments that are not yet resolved?
- Are there edge cases or error states not covered by the acceptance criteria?
- For UI changes: does the design cover all required states (loading, empty, error)?
- Are there database schema changes or migrations required?
- Are there any known constraints (performance, security, backwards compatibility)?

Stop asking once all acceptance criteria can be met without ambiguity.

### Step 4: Create an implementation plan

Write a numbered implementation plan to the plan file. The plan must include:

1. **Branch name** — format: `issue-#NUMBER-short-title-with-dashes` (lowercase, no special characters)
2. **Files to create or modify** — list each file and what changes are needed
3. **Database migrations** — list any new migration files needed
4. **Tests** — list new or updated test files (`*.tests.ts` for unit, `server.tests.ts` for integration)
5. **Storybook stories** — for UI changes, list new or updated story files
6. **Order of implementation** — a step-by-step sequence that avoids breaking intermediate states

Once the plan is written to the plan file, call `ExitPlanMode`. Do not write any code until the user has approved the plan.

### Step 5: Create the branch and start implementing

Once the user approves the plan, ensure the working tree starts from a clean, up-to-date main:

```bash
git checkout main
git pull
```

If there are uncommitted changes on the current branch, stop and ask the user how to handle them before switching.

Then create and switch to the feature branch:

```bash
git checkout -b issue-#NUMBER-short-title-with-dashes
```

Implement the plan step by step in the agreed order. After each logical chunk, briefly report what was done and what comes next.

### Step 6: Pre-commit checks

When finished the implementation, ask the user to check it and if you can commit. Do NOT commit without explicit agreement. Before you commit, run the following checks in order:

1. **Lint:**
   ```bash
   pnpm lint
   ```
   Fix any lint errors before proceeding.

2. **Tests:**
   ```bash
   pnpm test
   ```
   All tests must pass. Fix any failures before proceeding.

3. **Chromatic (UI changes only):** If the issue involved UI component changes, run visual regression tests:
   ```bash
   pnpm chromatic
   ```
   Review any visual diffs and confirm they are intentional before committing.

Report the outcome of each check to the user. Only proceed to commit once all checks pass.

### Step 7: Commit and push

When the user asks to commit and push, follow the template in `commit-template.md` (in this skill folder).

### Step 8: Open a Pull Request

When the user asks to create a PR, follow the template in `pr-template.md` (in this skill folder).

Return the PR URL to the user when done.

## Guidelines

- Never write code before the implementation plan is approved.
- Never commit without running lint and tests first.
- Always run Chromatic when UI components change — visual regressions are caught here, not in unit tests.
- Always use `Closes #NUMBER` in the PR body.
- One clarifying question at a time — never ask multiple questions in a single message.
- If the issue changes significantly during implementation (scope creep, new information), flag it to the user and revise the plan before continuing.
