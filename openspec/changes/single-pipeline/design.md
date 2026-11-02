# Design

## Context

Today each of `web.yml`, `assistant.yml`, `whatsapp.yml`, `wichteln.yml` and `dev-machine.yml` runs
on every pull request and on pushes to `main` filtered by path, repeats an inline `detect` job,
chains lint → test → build → deploy, and ends in its own `Gate <Service>` job. `infrastructure.yml`
runs only on `main`. The `default` ruleset on `main` requires the five `Gate …` checks (strict).

Reusable building blocks already exist and stay: `.github/actions/setup` (node + pnpm install),
`build-publish` (buildx, pushes only on `refs/heads/main`), `deploy-service` and
`deploy-infrastructure` (rsync + `docker compose` under a host-side `flock`, only on `push`).

The change guard (`scripts/change-guard.mjs` + `scripts/change-guard.test.mjs`, added in `3aeb40d`)
was deleted together with `homeserver.yml` in `180ad5d`; its logic is recoverable from history.

## Goals / Non-Goals

**Goals:**
- One workflow run per pull request update and per merge, readable top to bottom as
  detect → check → publish/deploy → gate.
- Path rules for "what changed" live in exactly one place.
- The required check name never depends on which services changed.

**Non-Goals:**
- The stack smoke suite: it is being moved out of the pipeline and is specified again by its own
  change; this change only removes its stale requirements from `pipeline`.
- Changing the deploy mechanics on the host (rsync, `docker compose`, `flock`) or the image names.
- Touching `dependabot-auto-merge.yml`; it is a `pull_request_target` helper, not a build pipeline.

## Decisions

### 1. One trigger file, per-service chain as a reusable workflow

`.github/workflows/pipeline.yml` ("Pipeline") is the only workflow with build triggers:
`pull_request: [opened, synchronize, reopened]`, `push: branches: [main]`, `workflow_dispatch`.
No `paths` filters — the detect job decides.

The per-service chain lives in `.github/workflows/service.yml`, triggered only by `workflow_call`,
with inputs: `service` (folder name), `image`, `compose-service`, `lint` (bool), `test-command`,
`playwright` (bool), `build-args`, `deploy` (bool). Its jobs: `lint` → `test` → `build` (via
`build-publish`) → `deploy` (via `deploy-service`, only when `inputs.deploy`). `pipeline.yml` calls it
five times, each gated by `if: needs.changes.outputs.<service> == 'true'`. The calls appear as
"Web / Lint", "Assistant / Test", … inside the single Pipeline run.

*Alternatives:* (a) all ~20 jobs written out in `pipeline.yml` — the duplication we are leaving
behind; (b) one matrix per stage — a failing web test would then block publishing an unrelated
assistant image, and the web job's extra Playwright/three-project steps don't fit a uniform matrix.
The reusable workflow keeps each service's chain independent while staying one pipeline run.

### 2. Change detection as a tested Node script

`.github/scripts/detect-changes.mjs` takes the list of changed paths and returns the set
`{web, assistant, whatsapp, wichteln, dev-machine, infrastructure}` per the rules in
`specs/pipeline/spec.md` (service folders; shared workspace files → all services;
`.github/workflows/pipeline.yml`, `.github/workflows/service.yml`, `.github/actions/**`,
`.github/scripts/**` → everything). The `changes` job computes the diff range and writes one boolean
output per target:
- `pull_request`: `git diff --name-only origin/$BASE_REF...HEAD` (checkout with `fetch-depth: 0`).
- `push` to main: `github.event.before..github.sha`; if `before` is all zeros or not reachable
  (`git cat-file -e`), report everything.
- `workflow_dispatch`: report everything.

*Alternative:* `dorny/paths-filter` — a third-party action whose dispatch/first-push behaviour
differs from what we need, and its rules can't be unit-tested here.

### 3. Change guard restored as `.github/scripts/change-guard.mjs`

Recover the script and its `node:test` file from `3aeb40d` into `.github/scripts/` (there is no
root `scripts/` folder any more) and tighten the sync rule: collect every
`openspec/changes/archive/<date>-<name>/specs/<path>/spec.md` and require
`openspec/specs/<path>/spec.md` in the changed paths, reporting each missing one. The
`change-guard` job runs only for `pull_request`, first `node --test .github/scripts/`, then the guard
with `HEAD_REF=${{ github.head_ref }}` and `BASE_REF=origin/${{ github.base_ref }}`. Running the
scripts' own tests there means a broken detector or guard fails the pull request that broke it.

### 4. Infrastructure deploy replaces the per-service deploys

`pipeline.yml` passes `deploy: ${{ github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && needs.changes.outputs.infrastructure != 'true' }}`
to every service call. A separate `deploy-infrastructure` job needs `changes` and all five service
calls and runs with
`if: always() && github.ref == 'refs/heads/main' && needs.changes.outputs.infrastructure == 'true' && !contains(needs.*.result, 'failure') && !contains(needs.*.result, 'cancelled')`,
so it waits for skipped services, never runs after a failed publish, and recreates the stack once
with every new image. The composite deploy actions keep their own `github.event_name == 'push'`
guards, which also makes a manual dispatch build but not deploy — unchanged from today.
Runs started by Dependabot deploy like any other `main` run; there is no actor exclusion.

### 5. Quality Gate

Job id `quality-gate`, name "Quality Gate", `needs:` every other top-level job (`changes`,
`change-guard`, the five service calls, `deploy-infrastructure`), `if: always()`. One step fails when
`contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')`; `success` and
`skipped` pass. A reusable-workflow call reports `failure` if any of its inner jobs failed, and
`skipped` when its `if` was false, so per-service results roll up correctly.

### 6. Concurrency

`concurrency: { group: pipeline-${{ github.ref }}, cancel-in-progress: ${{ github.event_name == 'pull_request' }} }`
— superseded pull-request runs are cancelled; runs on `main` queue so a deploy is never interrupted.
Host-side `flock` still serialises the deploys inside one run.

## Risks / Trade-offs

- [This change's own pull request deletes the workflows that produce the five required `Gate …`
  checks, so it can never satisfy the current ruleset] → Once the Pipeline has run on this pull
  request and "Quality Gate" is green, update the `default` ruleset to require only "Quality Gate"
  (with the user's confirmation), then merge.
- [Other open pull requests created before the switch have no "Quality Gate" check] → They get one
  on their next update; rebase or `@dependabot rebase` them.
- [The first `main` run after merge sees `pipeline.yml` as changed and redeploys the whole stack] →
  Intended: it proves the new deploy path end to end; schedule the merge accordingly.
- [Editing any pipeline file rebuilds and redeploys everything] → Accepted; pipeline edits are rare
  and a full run is the safe check for them.
- [A pull request with no OpenSpec change (e.g. Dependabot) passes the guard as out of scope] →
  Kept deliberately so dependency bumps still auto-merge.
- [`github.event.before` is missing after a forced push to main] → Treated as "everything changed".

## Migration Plan

1. Land `pipeline.yml`, `service.yml` and `.github/scripts/` alongside the old workflows; open the
   pull request; confirm the Pipeline run and "Quality Gate" behave (old gates may still run).
2. Delete the six old workflows in the same branch; confirm the Pipeline again.
3. Switch the ruleset's required checks to "Quality Gate" (strict policy kept), merge, and watch the
   first `main` run deploy the stack.

Rollback: revert the merge commit and restore the five `Gate …` required checks in the ruleset.
