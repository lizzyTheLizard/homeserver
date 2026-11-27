# Proposal

## Why

Renovate creates branches for outdated dependencies but opens no pull request for them. With `prCreation: 'not-pending'` it waits for a real status check on the branch. The only status on a Renovate branch is its own `renovate/stability-days`, and the "Pull request" pipeline runs only once a pull request exists, so Renovate treats the branch as pending until it is 25 hours old (`prNotPendingHours`). Every merge to main makes Renovate rebase all branches (`rebaseWhen: 'behind-base-branch'`), which resets that age, so the pull requests are never opened unless someone ticks them in the dashboard.

## What Changes

- Renovate does not create a branch for an update until the release is at least one day old (`internalChecksFilter: 'strict'`).
- Renovate opens the pull request as soon as the branch exists (`prCreation: 'immediate'`), so it no longer waits for a check that cannot run before the pull request.
- The branch limit that only existed to hold the branches waiting for their minimum age (`branchConcurrentLimit`) is removed, because such branches no longer exist.

## Capabilities

### New Capabilities

### Modified Capabilities

- `pipeline`: updates are proposed as soon as their release is old enough and no longer wait for a status check that cannot run before the pull request exists; waiting updates no longer exist as branches.

## Impact

- `renovate.json5` only. No code, no workflow and no image change.
- The updates currently waiting in the dependency dashboard get their pull requests on the first Renovate run after the merge.
