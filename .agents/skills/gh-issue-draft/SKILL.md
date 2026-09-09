---
name: gh-issue-draft
description: Turn a finished exploration into a GitHub issue using the repo's issue template. Use after /openspec-explore, or whenever the user wants to file an issue that a change proposal will later be built from. Not for starting work on an issue that already exists - that is gh-change-start.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(openspec:*), Read, Write
license: MIT
metadata:
  author: gh-spec-flow
  version: "1.0"
---

Write a GitHub issue from what exploration established, and file it.

An issue is the entry point of this repo's OpenSpec flow: `gh-change-start` reads
it, the change set is named after it, and the pull request closes it. Everything
the proposal will be built from has to survive in the issue text - the
exploration conversation does not.

**Input**: the exploration that just happened, or a description from the user.

## Steps

1. **Refuse to file something that is not ready.**
   Read `issue-template.md` (in this skill folder). If you cannot fill in *User Story*,
   *Acceptance Criteria* and *Out of Scope* from what you actually know, ask the user
   the missing questions instead of writing filler — an issue with invented scope
   produces a proposal with invented scope.

   Populate *Additional Information* only with what you actually have, and leave
   *Open questions* populated when questions genuinely remain. An issue may be
   filed with open questions; `gh-change-start` surfaces them before proposing.

2. **Draft the body** following the template's section structure exactly. Drop the
   HTML comments. Do not add sections the template does not have.

   Ground every claim about the current system in something you read. If
   exploration touched `openspec/specs/`, name the capability paths under
   *Affected capabilities*.

3. **Show the user the full draft** - title and body - and wait. Do not file it
   in the same response as the draft.

4. **File it** once approved:

   ```bash
   gh issue create --title "<title>" --body-file <path>
   ```

   Write the body to a scratch file first, not inline, so
   nothing gets mangled by shell quoting.

5. **Offer the next step.** Print the issue number and URL, then ask whether to
   continue straight into the proposal. If yes, hand over to the
   **gh-change-start** skill with that issue number - do not create branches or
   changes here.

## Guardrails

- One issue, one change set. If exploration produced two independent things,
  file two issues.
- Never file an issue without showing the user the body first.
- Do not create a branch, a change folder, or any OpenSpec artifact in this skill.
