# Design

## Context

Renovate's `branchConcurrentLimit` defaults to `prConcurrentLimit` (5 here) and counts every existing update branch, including those that `prCreation: 'not-pending'` keeps without a pull request while `minimumReleaseAge` has not passed. See proposal.md.

## Goals / Non-Goals

**Goals:**
- Pending branches no longer block new updates.

**Non-Goals:**
- Changing `prConcurrentLimit`, `minimumReleaseAge` or `prCreation`.

## Decisions

- `branchConcurrentLimit: 20`, comfortably above the dozen or so pending updates seen today, while `prConcurrentLimit: 5` still bounds the pipeline load.
- Alternatives: `0` (unlimited) would remove the bound if many majors appear; raising `prConcurrentLimit` would re-test more pull requests after each merge.

## Risks / Trade-offs

- [More branches exist at once] → They have no pull request, so no pipeline runs; Renovate rebases them only when it creates the pull request.
- [The cause is inferred, not confirmed with a debug log] → After the next run, check that the dashboard's Rate-Limited section empties; if not, run the workflow with log level debug.
