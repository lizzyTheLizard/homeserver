# Proposal

## Why

Renovate creates a branch for every update that waits for its one-day minimum release age, and these branches count against the concurrency limit that defaults to `prConcurrentLimit` (5). With a dozen pending branches the limit is exhausted, so further updates stay "Rate-Limited" on the Dependency Dashboard and no new pull requests are opened, even though no pull request is open.

## What Changes

- Set `branchConcurrentLimit` to 20 in `.github/renovate.json5`, with a comment explaining why.
- `prConcurrentLimit` stays at 5, so at most five pull requests are open and re-tested at once.

## Capabilities

### New Capabilities

### Modified Capabilities
- `pipeline`: Renovate branches that only wait for the minimum release age no longer block other updates.

## Impact

- `.github/renovate.json5` only. Up to 20 Renovate branches may exist at a time; branches without a pull request do not run the pipeline.
