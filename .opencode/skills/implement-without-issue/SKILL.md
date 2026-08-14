---
name: implement-without-issue
description: Use when the user wants to "implement without an issue", "skip creating an issue", "quick implementation", "just implement this directly", or "fast-track" a change without GitHub issue overhead. Gathers requirements into an approved draft, implements everything on a new branch, runs all checks, and creates and merges a PR — without ever creating a GitHub issue.
---

# Implement Without Issue

Fast-track workflow for implementing a change end-to-end without creating a GitHub issue. Requirements are gathered into a draft that the user approves; the draft is the specification for the implementation and is never published to GitHub. There is no issue number, no project status, and no milestone at any point in this workflow.

## Workflow

### Phase 1: Requirements Draft

#### Step 1: Get the initial idea

Ask the user to describe what they want to achieve or what problem they want to solve. One open question is enough — do not ask multiple questions at once:

> "What would you like to implement? Describe the goal or problem in your own words."

#### Step 2: Ask clarifying questions

Identify gaps in understanding before drafting anything. Cover the following areas — skip any that are already clear:

- **Who benefits?** Who is the user/role this is for? (needed for the User Story)
- **What is the success condition?** How do we know when this is done? (needed for acceptance criteria)
- **Scope / edge cases** — are there known constraints, error cases, or out-of-scope items?
- **UI / design needed?** Does this feature require a new screen, form, or visual design? Check the `design/` folder to see if a design already exists.
- **Technical constraints** — relevant architecture decisions, dependencies, or implementation notes.

Stop asking questions once there is enough information to write a complete, unambiguous draft.

#### Step 3: Draft the requirements for review

Present a draft to the user before implementing anything. Format it like this:

```markdown
## User Story

As a [role], I want to [action] so that [benefit].

## Acceptance Criteria

- [ ] ...
- [ ] ...
- [ ] ...

## Additional Information

### Technical Notes

### UI / Design Requirements

### Out of Scope
```

Ask the user to confirm or request changes. If the user requests changes, update the draft, show the full draft to the user and ask for confirmation again. Repeat until the user approves the draft without changes. Do not continue until the user explicitly approves the draft.

**Drafting guidelines:**

- Keep the User Story to 2–3 sentences. Avoid implementation details there — save those for Technical Notes.
- Acceptance criteria must be testable and written as observable outcomes ("the user can…", "the system returns…"), not implementation steps. Keep them to 3–5 max.
- If a UI design is needed, say so explicitly in the UI / Design Requirements section so it is not overlooked. If a design already exists in `design/`, include a link to it.
- Omit empty sections from the final draft — do not leave placeholder comments.

Keep the approved draft in context — it is the specification for everything that follows and replaces a GitHub issue entirely.

### Phase 2: Branch Setup

#### Step 4: Check for uncommitted changes

```bash
git status --porcelain
```

If there are uncommitted changes, stop and ask the user how to handle them (stash, commit, or discard) before proceeding.

#### Step 5: Prepare the branch

```bash
git checkout main
git pull origin main
```

Generate the branch name from the draft title: `issue-XXX-<kebab-case-title>` (lowercase, no special characters). Since no GitHub issue exists, `XXX` is used literally as a fixed placeholder.

Create the branch:

```bash
git checkout -b issue-XXX-<kebab-title>
```

#### Step 6: Push the branch

```bash
git push -u origin HEAD
```

### Phase 3: Implementation

#### Step 7: Derive the change list from the draft

Parse the approved draft to extract:
- **Acceptance Criteria** — each `- [ ]` item is a task
- **Technical Notes** — files to modify or create
- **UI / Design Requirements** — reference to `design/` files
- **Task lists** in the draft

Derive a structured change list. Examples:
- Create a new database migration file: `db/<description>.sql`
- Add a new server action in `app/<page>/server.ts`
- Create a new component: `app/<page>/_components/<name>.tsx`
- Add tests: `<file>.tests.ts`, `<file>.server.tests.ts`
- Add Storybook stories: `<file>.stories.ts`

Do NOT present the change list to the user for selection — always implement every item.

#### Step 8: Implement all changes

Implement the complete change list following the project conventions from `AGENTS.md`.

#### Step 9: User review

Ask the user to review the changes. Do not commit until the user approves.

#### Step 10: Pre-commit checks

Run all checks in order. Fix any issues before proceeding. Do not commit until everything is green.

**10a. Lint:**
```bash
pnpm lint
```

**10b. Tests:**
```bash
pnpm test
```

**10c. Build:**
```bash
pnpm build
```

**10d. Chromatic (if UI changes):**
```bash
pnpm chromatic
```
Review visual diffs with the user and confirm they are intentional.

**10e. Documentation:**

Check if `AGENTS.md` or `README.md` needs updating:
- Were new patterns, conventions, or configuration introduced?
- Were new environment variables or dependencies added?

If so, ask the user if documentation should be updated and then do it.

#### Step 11: Commit and push

When the user approves and checks pass:

```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
<short imperative message>

Co-Authored-By: opencode <noreply@opencode.ai>
EOF
)"
git push
```

**Message rules:**
- Imperative mood, present tense ("Add", "Fix", "Wire up" — not "Added" or "Adding")
- Under 72 characters for the subject line
- Do NOT reference an issue number — there is none

### Phase 4: Finish

#### Step 12: Review changes and commit

Show a list of all changed files to the user and ask the user to review them. Once approved, commit the changes. If the user wants to make additional changes, do them. When the user has made changes, re-run the checks from step 10 until the user approves. Then (and only then) commit the changes and push them:

```bash
git add <relevant files>
git commit -m "$(cat <<'EOF'
<short imperative message>

Co-Authored-By: opencode <noreply@opencode.ai>
EOF
)"
git push
```

If there is nothing to commit, skip the commit and continue.

#### Step 13: Create the Pull Request

```bash
gh pr create --title "<short title>" --body "$(cat <<'EOF'
## Summary

<2–4 bullets describing what was done>
EOF
)" --assignee "@me"
```

**PR rules:**
- Title is short and clear — no issue number, as there is none
- Keep the body concise — the approved draft in this session contains the full context
- Do NOT add a `Closes #...` line — no issue exists to close

#### Step 14: Wait for PR checks and auto-merge

Report the PR URL. Enable auto-merge:

```bash
gh pr merge --auto --squash "<PR-NUMBER>"
```

Monitor the PR status until all checks pass. If checks fail, investigate, fix with new commits, and push until green.

If merge conflicts arise, resolve them:

```bash
git fetch origin
git rebase origin/main
# resolve conflicts
git push --force-with-lease
```

#### Step 15: Report

Once the PR is merged, report that to the user.
