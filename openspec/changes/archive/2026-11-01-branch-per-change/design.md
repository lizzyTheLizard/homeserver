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
- Rejection is deterministic at the pull request gate, from one tested implementation.
- A pull request carries only the archived change, with its delta specs already synced.
- The guard tolerates legacy `issue-<n>-<slug>` names and changes that opt out of specs.

**Non-Goals:**

- GitHub branch protection / rulesets, which guard direct pushes to the default branch. That is repository settings, not code; the change assumes protection on `main` stays in place.
- Blocking a local commit or push before it reaches GitHub. Enforcement happens at the pull request.
- Migrating or renaming existing branches, change folders or archive entries.
- Closing, migrating or back-filling existing GitHub issues. They stop being part of the flow but remain readable history.

## Decisions

### The lifecycle text lives in `openspec/config.yaml`, not in skills

Every stock workflow starts by asking the CLI for instructions, and the CLI merges project config into that answer: `context` is attached to the propose artifacts, the apply operation and the archive inputs; `rules.proposal` is attached to the proposal artifact; `operations.apply.guidance` and `operations.archive.guidance` are attached to their operations. Putting the contract there means one file, no second copy to drift, and no dependency on an agent choosing to load an extra skill.

Alternatives considered: hand-written `gh-*` skills (three files duplicating the same rules, invisible to the CLI, and exactly what drifted in practice — see the `issue-#263-…` branches); forking the schema (its `instruction` blocks are per artifact, still cannot run git, and it has no archive operation to hang the PR step on); patching the generated `openspec-*` skills (overwritten by `openspec update`).

### Branch creation is a propose-phase rule, expressed through `context` and `rules.proposal`

There is no `propose` operation id to attach guidance to, so the rule rides on the artifact instructions: before writing the first artifact, assert a clean tree (`git status --porcelain` empty), `git fetch origin`, then `git switch -c <change> origin/main`. `origin/main` is the start point rather than `main` because a local `main` may not exist and, when it does, may be stale; `git switch -c` fails when the name is taken, which is the desired behaviour (stop, tell the user to switch to the existing branch, never reuse or force-move it). Rejected: `git switch main && git pull && git switch -c` — needs local tracking setup and a second network round trip.

### The change name is the slug, and the slug is the branch

The name is derived from the request: lowercase, non-alphanumerics collapsed to `-`, trimmed, with `#` and issue numbers stripped, then used verbatim as both `openspec/changes/<name>` and the branch. `rules.proposal` says a change starts from a request or an explicit name. The guard compares branch to folder name and never to a pattern, so pre-existing `issue-<n>-<slug>` changes keep working, and any future naming rule only has to change one config stanza.

### Commit shape stays one task per commit

`context` states that the reviewed plan is committed to the branch when the artifacts are complete, before implementation starts. `operations.apply.guidance` keeps the existing one-task-one-commit and review-before-commit rules, with `OpenSpec-Change: <change>` and `Agent:` trailers and the `(#<n>)` issue suffix removed. `operations.archive.guidance` stages the archive commit as `openspec/` only. Rejected: one squashed commit at merge time — it erases the per-task review trail the apply workflow is built around.

### The PR step rides on the archive operation

The archive workflow is the last step, and `openspec instructions archive` is where the CLI hands back `operations.archive.guidance`. So the guidance there ends the flow: commit the archive isolated to `openspec/`, push, open the PR to `main` with a `## Summary` body, an `OpenSpec-Change: <change>` line and a link to the archived proposal, then `gh pr merge --auto --squash`. Guidance is advisory — the CI guard is what makes a missing or wrongly-branched PR visible.

### The guard runs inside the normal CI workflow, on pull requests only

`.github/workflows/homeserver.yml` gains a `change-guard` job and a `pull_request` trigger. Every existing job is gated with `if: github.event_name != 'pull_request'`, so pushes and manual runs behave exactly as before and a pull request runs only the guard. The job checks out with `fetch-depth: 0` and runs `node scripts/change-guard.mjs` with `HEAD_REF=${{ github.head_ref }}` and `BASE_REF=origin/${{ github.base_ref }}`.

Two reasons for a pull request trigger rather than the existing push trigger: the rule is about what a pull request may contain, and a push-time check would turn every implementation push red between the plan commit and the archive. A separate workflow file was rejected — the repository already has one CI workflow, and a second one is a second place to notice when checks go green. Also rejected: keeping the push trigger and skipping the check while an unarchived change exists, which inverts the rule and cannot see the pull request's base.

### A pull request carries only the archived change

The guard's rule is "archived, synced, and named after the branch", not "names the change": any path under `openspec/changes/<name>/` fails the pull request, because archiving is the last step of the flow and a PR that still shows a live change folder has skipped it. Exactly one archived folder is required, its name must equal the head branch, and when it carries `specs/` deltas the pull request must also touch `openspec/specs/` — the sync proves the archive step actually ran and did not just move the folder.

### Guard logic is a tested pure module

`scripts/change-guard.mjs` exports `resolveChangeForBranch(branch, paths)` returning `{ ok, change, reason }`, and a CLI entrypoint that reads `HEAD_REF`/`BASE_REF` for the workflow. `scripts/change-guard.test.mjs` runs with `node --test` (no dependency, Node 24) and covers the unarchived case, the archived case, the sync check, the out-of-scope pull request and multi-change ambiguity. Rejected: inline bash in the workflow — it cannot be tested locally, and these rules are exactly what needs fixtures.

### Archive retains the name

`openspec archive` moves the folder to `openspec/changes/archive/<date>-<name>`. The guard compares the archived folder's suffix to the head branch, which is why the archive must happen before the PR opens: a shipped PR contains only the archived path.

## Risks / Trade-offs

- [Config guidance is advisory; an agent can ignore it] → the CI guard is the deterministic part and fails loudly with the expected branch name.
- [A commit on `main` is only caught at the PR gate, or not at all] → branch protection on `main` must stay enabled; the guard cannot prevent a local commit, only a merge from a wrongly named branch.
- [`context` is injected into every operation, so it cannot be step-specific] → keep it to invariants that are true at every step (branch, commits stay on branch); step-specific text goes in `rules.proposal` or the operation guidance.
- [PRs touching no change folder skip the guard] → accepted: blocking Dependabot and docs PRs would be worse than the gap, and the flow always creates the folder.
- [Guard fails when a PR legitimately spans two changes] → intended: one branch, one change; split the work.
- [Archived suffix match could collide with another change whose name ends in `-<name>`] → the guard requires exactly one match, so an ambiguity fails loudly instead of guessing.
- [The sync check is a heuristic: it compares presence of delta specs and touched main specs, not their content] → an archive whose deltas are textually identical to the main spec would fail; the fix is to touch the spec file, and in practice archiving rewrites it.
- [The guard only runs on pull requests] → an unarchived branch stays unflagged until a PR opens, which is exactly when the rule applies.
- [CI needs history for the merge-base diff] → `fetch-depth: 0` is explicit in the workflow; without it the job fails rather than silently passing.
- [Renaming convention breaks in-flight `issue-<n>-<slug>` PRs] → the guard never checks the old pattern, only branch == folder, so they pass unchanged.

## Migration Plan

1. Delete `.agents/skills/gh-issue-draft/`, `gh-change-start/`, `gh-change-ship/` and their rows in `AGENTS.md`/`README.md` first, so no entry point still advertises issues or wraps the workflows.
2. Write the contract into `openspec/config.yaml` (`context`, `rules.proposal`, `operations.apply.guidance`, `operations.archive.guidance`), then confirm with `openspec instructions proposal|apply|archive --change <name> --json` that each consumer receives it.
3. The `change-guard` job activates on the next pull request. Existing open issue-named branches are unaffected.
4. Rollback is independent per layer: drop the `change-guard` job and the `pull_request` trigger to disable enforcement; restore the previous `config.yaml` to get the issue-first text back.
