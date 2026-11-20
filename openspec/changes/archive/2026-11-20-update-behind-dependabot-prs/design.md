# Design

## Context

See proposal.md - Why. The ruleset on `main` has `strict_required_status_checks_policy: true` on "Quality Gate". The workflow `dependabot-auto-merge.yml` arms squash auto-merge with the `homeserver-automerge` app token for patch and minor updates. A merge or push made with `GITHUB_TOKEN` starts no workflow run, so the update must use the app token as well.

## Goals / Non-Goals

**Goals:**
- Let armed auto-merge on Dependabot pull requests complete without manual rebases.
- Keep the number of pipeline runs low.

**Non-Goals:**
- Arming auto-merge for major updates or for non-Dependabot pull requests.
- Changing the ruleset or introducing a merge queue.
- Fixing pull requests whose checks fail.

## Decisions

- **Trigger on `push` to `main` plus `workflow_dispatch`.** Every merge changes `main` and is the moment other pull requests become behind. The manual trigger starts the chain for the current backlog and restarts it after a stall. Alternative: a schedule, rejected as slower and noisier.
- **Update one pull request per run.** Updating all behind pull requests would run the full pipeline for each of them after every merge, roughly N²/2 runs for N pull requests. With one at a time, each merge starts the next update and the chain needs N runs. Alternative: update all, rejected for its cost on a self-hosted pipeline.
- **Pick the oldest eligible pull request.** Eligible means open, authored by Dependabot, auto-merge armed and `mergeStateStatus` `BEHIND`. The lowest number goes first, which makes the order predictable.
- **Wait while an update is in flight.** If a pull request with armed auto-merge is not behind and has no failed check, it is expected to merge and trigger the next run, so the workflow does nothing. A pull request with a failed check does not count, so one broken pull request cannot stall the others.
- **Use `gh pr update-branch` with the app token.** It merges `main` into the head branch through the API, needs no checkout and runs as the app, so the push starts the pipeline. The token is created with `actions/create-github-app-token`, as in `dependabot-auto-merge.yml`, with contents and pull-requests write permission.
- **Use `gh pr list --json`** to read the author, auto-merge state, merge state and check results in one call; the workflow's own `GITHUB_TOKEN` permissions stay at `contents: read`.

## Risks / Trade-offs

- [A pull request is updated but its checks never finish or never report] → it counts as in flight and blocks the chain; start `workflow_dispatch` after fixing or closing it.
- [Dependabot stops rebasing a pull request that has a commit of its own] → acceptable, because this workflow keeps it current; closing the pull request lets Dependabot recreate it.
- [Two runs overlap after quick successive merges] → add a `concurrency` group so a second run waits for the first instead of updating two pull requests.
- [A merge commit lands on the Dependabot branch] → harmless, because the ruleset allows squash merges only and `main` stays linear.
