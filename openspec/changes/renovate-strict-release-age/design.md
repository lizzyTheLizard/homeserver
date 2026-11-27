# Design

## Context

`.github/renovate.json5` sets `minimumReleaseAge: '1 day'` and `prCreation: 'not-pending'`. Renovate sets a status `renovate/stability-days` on each branch (pending until the release is old enough). `not-pending` treats a branch whose only successful checks are such internal `renovate/` checks as pending until `prNotPendingHours` (25) have passed since the branch was last committed. The debug log of the dispatched run shows exactly this ("Successful checks are all internal renovate/ checks, so returning pending", "Branch is 0 hours old - skipping PR creation as prNotPendingHours is set to 25"). The "Pull request" pipeline runs only on `pull_request`, so no other check ever appears on a branch without a pull request. `rebaseWhen: 'behind-base-branch'` recommits every branch after each merge to main, resetting the age.

## Goals / Non-Goals

**Goals:**
- A pull request is opened as soon as the release is at least one day old, regardless of how often main changes.
- pnpm's own minimum release age still never fails an install on a Renovate pull request.

**Non-Goals:**
- Changing the rebase strategy, the automerge rules or the pull request limit.
- Changing the Renovate workflow or its schedule.

## Decisions

- **`internalChecksFilter: 'strict'`**: Renovate creates the branch only once `renovate/stability-days` would be green. This keeps the guarantee that motivated `not-pending` (no pull request on a release younger than a day) without a branch that waits.
- **`prCreation: 'immediate'`**: with strict filtering the branch is already eligible, so the pull request is opened with it. Alternative `not-pending` with a lower `prNotPendingHours` was rejected: the age still resets on every rebase, so any value above the interval between merges has the same problem. Alternative `status-success` was rejected for the same missing-check reason.
- **Package rule for `major` before the `postgres` rule**: sets `commitMessagePrefix: '⚠️ MAJOR UPDATE:'` and a `[!WARNING]` `prHeader` (major update, manual merge required, check the release notes). Renovate applies matching rules in order and later ones override earlier ones, so the more specific `postgres` rule placed after it keeps its own prefix and header. `automerge: false` is not repeated: automerge is only enabled for `minor` and `patch`, so a major update is already manual; the rule only labels it.
- **Remove `branchConcurrentLimit`**: it existed because branches waiting for their minimum age counted against the branch limit. With strict filtering they are not created, so the default (equal to `prConcurrentLimit`) is right again and the pull request limit still bounds the work.

## Risks / Trade-offs

- A branch for an update is created up to one Renovate run later than before, because it appears only after the release is old enough. Runs happen nightly and after every merge, so the delay is small.
- Behaviour of `strict` was not run against this repository yet; the first run after the merge confirms it and a failure would show as still-missing pull requests in the dashboard.
