---
name: gh-change-start
description: Start work on an existing GitHub issue - create the issue-<n>-<slug> branch off a clean up-to-date main and run the OpenSpec propose workflow against the issue. Use when the user says to start, pick up, or work on an issue by number. Also covers committing the reviewed plan to that branch.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(openspec:*), Read, Write, Edit
license: MIT
metadata:
  author: gh-spec-flow
  version: "1.0"
---

Take a GitHub issue and turn it into a change set on its own branch, with a
reviewed and committed plan.

Every change in this repo is anchored to an issue. The change name, the branch
name and the issue number are one triple: change `issue-<n>-<slug>` on branch
`issue-<n>-<slug>` closing `#<n>`. Every later step reconstructs its state from
the branch name, so this step is what makes the rest work.

**Input**: a GitHub issue number. If the user did not give one, ask — do not
guess from context, and do not proceed without one. If they describe work with
no issue at all, use the **gh-issue-draft** skill first.

## Steps

1. **Read the issue and check it is workable.**

   ```bash
   gh issue view <n> --json number,title,state,body,labels,url
   ```

   If the issue's *Open questions* section still has unanswered questions, or the
   issue is too thin to propose from, ask the user those questions now and get
   answers before going further. Offer to update the issue body with the answers
   (`gh issue edit <n>`) so the record stays in one place.

   Generate a `change_name` from the issue number and title, e.g.
   `issue-1234-add-foo-bar`. It must not contain spaces or special characters,
   so slugify the title.

2. **Set up the branch.**

   If any of these steps fail, stop and tell the user what to do. If the branch
   already exists locally or on the remote, stop and tell the user to fetch and
   switch to it instead of starting over. If the working tree is not clean, stop
   and tell the user to commit or stash first.

   ```bash
   git status --porcelain
   git fetch origin
   git switch main
   git pull
   git switch -c "<change_name>"
   ```

3. **Propose.** Run the stock OpenSpec workflow with the `change_name` you
   generated:

   ```
   /openspec-propose <change_name>
   ```

   Feed it the issue body as the source material. The proposal's scope is the
   issue's scope — if writing the artifacts reveals that the issue was wrong or
   incomplete, stop and say so rather than quietly proposing something wider.

4. **Review the plan with the user.** Walk them through the proposal, delta
   specs, design and tasks. Check specifically that:

   - the tasks are each independently committable — one task becomes one commit,
     so a task that cannot stand alone is the wrong size;
   - the delta specs use the capability paths that already exist under
     `openspec/specs/`, rather than inventing parallel ones;
   - nothing in the plan exceeds what the issue asked for.

   Use `/openspec-update-change` to revise. Iterate until the user is satisfied.

5. **Commit the plan** to the branch:
   - Make sure only the folder `openspec/changes/<change_name>` has been
     modified. Stop and warn the user if anything else is dirty.
   - Commit and push using the standard message format (substitute the real
     values):

       ```bash
       git add openspec/changes/<change_name>
       git commit -m "Plan for #<n>" -m "OpenSpec-Change: <change_name>
       Agent: deepseek-harness"
       git push
       ```

   Then stop. Implementation starts on a new user request, via
   `/openspec-apply-change`.

## Guardrails

- Never start a change without an issue number.
- Create the branch only through the steps above (fetch → switch main → pull →
  switch -c). They re-check "clean, up to date, correctly named, not already
  taken" every time — do not create the branch by hand.
- Do not write code in this skill. Planning artifacts only.
- If the user asks to start a second change while the tree is dirty, refuse and
  point at the unfinished work.
