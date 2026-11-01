# Design

## Context

See `proposal.md` for motivation. The constraints that shape the approach:

- The OpenSpec CLI is a file-and-instruction tool. `new change`, `status`, `instructions` and `archive` read and write files; the bundled `spec-driven` schema contributes markdown `instruction` blocks plus an `apply` operation (`schemas/spec-driven/schema.yaml:268` in the installed package). There is no hook that executes shell commands, so branch creation cannot be a CLI feature.
- `openspec/config.yaml` is the CLI's injection point. `context` is returned with every `openspec instructions` response, `rules.<artifact-id>` with that artifact's instructions, and `operations.<id>.guidance` with the `apply` and `archive` operations — `dist/core/project-config.js` accepts exactly `apply` and `archive`, and `generateArchiveInstructions` loads the archive guidance even though the shipped schema defines no archive section of its own.
- The `openspec-*` skills are generated. `.agents/skills/openspec-propose/SKILL.md` carries `generatedBy: 1.12.0`, and `openspec update` rewrites those files — custom text there is lost on upgrade.
- This checkout or a fresh clone need not have a local `main` branch; only `origin/main` is guaranteed. Switching branches also requires a clean tree.
- CI runs on `push` only (`.github/workflows/homeserver.yml:2-5`), and Dependabot PRs auto-merge without any change folder.

## Goals / Non-Goals

**Goals:**

- One place describes the whole lifecycle, and the stock OpenSpec workflows consume it.
- The branch exists before the plan does, and its name is exactly the change name.
- Plan, per-task and archive commits all land on that branch; the PR opens from it after archive.
- No GitHub issue is required anywhere in the flow, and no step reads or writes one.
- Rejection is deterministic where the repository can enforce it (hooks locally, CI on PRs), not only a written instruction.
- The guard tolerates archived folders and legacy `issue-<n>-<slug>` names.

**Non-Goals:**

- GitHub branch protection / rulesets. That is repository settings, not code; the change assumes protection on `main` stays in place.
- Preventing `git commit --no-verify` / `git push --no-verify`. Hooks are a guard rail on the normal path; CI is the gate.
- Migrating or renaming existing branches, change folders or archive entries.
- Closing, migrating or back-filling existing GitHub issues. They stop being part of the flow but remain readable history.

## Decisions

### The lifecycle text lives in `openspec/config.yaml`, not in skills

Every stock workflow starts by asking the CLI for instructions, and the CLI merges project config into that answer: `context` is attached to the propose artifacts, the apply operation and the archive inputs; `rules.proposal` is attached to the proposal artifact; `operations.apply.guidance` and `operations.archive.guidance` are attached to their operations. Putting the contract there means one file, no second copy to drift, and no dependency on an agent choosing to load an extra skill.

Alternatives considered: hand-written `gh-*` skills (three files duplicating the same rules, invisible to the CLI, and exactly what drifted in practice — see the `issue-#263-…` branches); forking the schema (its `instruction` blocks are per artifact, still cannot run git, and it has no archive operation to hang the PR step on); patching the generated `openspec-*` skills (overwritten by `openspec update`).

### Branch creation is a propose-phase rule, expressed through `context` and `rules.proposal`

There is no `propose` operation id to attach guidance to, so the rule rides on the artifact instructions: before writing the first artifact, assert a clean tree (`git status --porcelain` empty), `git fetch origin`, then `git switch -c <change> origin/main`. `origin/main` is the start point rather than `main` because a local `main` may not exist and, when it does, may be stale; `git switch -c` fails when the name is taken, which is the desired behaviour (stop, tell the user to switch to the existing branch, never reuse or force-move it). Rejected: `git switch main && git pull && git switch -c` — needs local tracking setup and a second network round trip.

### The change name is the slug, and the slug is the branch

The name is derived from the request: lowercase, non-alphanumerics collapsed to `-`, trimmed, with `#` and issue numbers stripped, then used verbatim as both `openspec/changes/<name>` and the branch. `rules.proposal` says a change starts from a request or an explicit name, never from an issue. The guard compares branch to folder name and never to a pattern, so pre-existing `issue-<n>-<slug>` changes keep working, and any future naming rule only has to change one config stanza.

### Commit shape stays one task per commit

`context` states that the reviewed plan is committed to the branch when the artifacts are complete, before implementation starts. `operations.apply.guidance` keeps the existing one-task-one-commit and review-before-commit rules, with `OpenSpec-Change: <change>` and `Agent:` trailers and the `(#<n>)` issue suffix removed. `operations.archive.guidance` stages the archive commit as `openspec/` only. Rejected: one squashed commit at merge time — it erases the per-task review trail the apply workflow is built around.

### The PR step rides on the archive operation

The archive workflow is the last step, and `openspec instructions archive` is where the CLI hands back `operations.archive.guidance`. So the guidance there ends the flow: commit the archive isolated to `openspec/`, push, open the PR to `main` with a `## Summary` body, an `OpenSpec-Change: <change>` line and a link to the archived proposal, then `gh pr merge --auto --squash`. Guidance is advisory — the CI guard is what makes a missing or wrongly-branched PR visible.

### Enforcement is two layers with different scopes

Local hooks catch the common accident before it becomes history:

- `.githooks/pre-commit` rejects staging `openspec/changes/**` or `openspec/specs/**` on `main`, and on a feature branch rejects staging `openspec/changes/<other>/` when `<other>` is not the branch (archive folders exempt).
- `.githooks/pre-push` rejects any refspec targeting `refs/heads/main`.

`core.hooksPath` is installed by a `prepare` script in `package.json`, so the next `pnpm install` (local, Docker, CI) wires it up; the script is tolerant of an environment without git. Rejected: Husky — an extra dependency for one `git config` call.

CI is the gate that hooks cannot be: `.github/workflows/change-guard.yml` runs on `pull_request`, checks out with `fetch-depth: 0`, diffs `origin/<base>...HEAD`, and passes the changed paths to `scripts/change-guard.mjs`. The job is in scope only when paths under `openspec/changes/` appear, so dependency and documentation PRs are unaffected.

### Guard logic is a tested pure module

`scripts/change-guard.mjs` exports `resolveChangeForBranch(branch, paths)` returning `{ ok, change, reason }`, and a CLI entrypoint that reads `HEAD_REF`/`BASE_REF` for the workflow. `scripts/change-guard.test.mjs` runs with `node --test` (no dependency, Node 24). Rejected: inline bash in the workflow — it cannot be tested locally, and the archived-folder rule is exactly the kind of logic that needs fixtures.

### Archive retains the name

`openspec archive` moves the folder to `openspec/changes/archive/<date>-<name>`. The guard accepts either `changes/<name>` or `changes/archive/<date>-<name>` by comparing the suffix, which is why the archive must happen before the PR opens: a shipped PR contains only the archived path.

## Risks / Trade-offs

- [Config guidance is advisory; an agent can ignore it] → the hooks and the CI guard are the deterministic parts, and both fail loudly with the expected branch name in the message.
- [Hooks are bypassable with `--no-verify`] → the CI guard on every PR that touches `openspec/changes/` is the actual gate; branch protection on `main` must stay enabled.
- [`context` is injected into every operation, so it cannot be step-specific] → keep it to invariants that are true at every step (branch, no issues, commits stay on branch); step-specific text goes in `rules.proposal` or the operation guidance.
- [PRs touching no change folder skip the guard] → accepted: blocking Dependabot and docs PRs would be worse than the gap, and the flow always creates the folder.
- [Guard fails when a PR legitimately spans two changes] → intended: one branch, one change; split the work.
- [Archived suffix match could collide with another change whose name ends in `-<name>`] → the guard requires exactly one match, so an ambiguity fails loudly instead of guessing.
- [CI needs history for the merge-base diff] → `fetch-depth: 0` is explicit in the workflow; without it the job fails rather than silently passing.
- [Renaming convention breaks in-flight `issue-<n>-<slug>` PRs] → the guard never checks the old pattern, only branch == folder, so they pass unchanged.

## Migration Plan

1. Delete `.agents/skills/gh-issue-draft/`, `gh-change-start/`, `gh-change-ship/` and their rows in `AGENTS.md`/`README.md` first, so no entry point still advertises issues or wraps the workflows.
2. Write the contract into `openspec/config.yaml` (`context`, `rules.proposal`, `operations.apply.guidance`, `operations.archive.guidance`), then confirm with `openspec instructions proposal|apply|archive --change <name> --json` that each consumer receives it.
3. Hooks take effect on the next `pnpm install`; verify with `git config core.hooksPath` → `.githooks`.
4. The CI guard activates on the next PR touching `openspec/changes/`. Existing open issue-named branches are unaffected.
5. Rollback is independent per layer: revert `.githooks` and the workflow to disable enforcement; restore the previous `config.yaml` to get the issue-first text back.
