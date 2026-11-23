# Proposal

## Why

Renovate currently ignores major `postgres` image updates (`enabled: false`), so a new PostgreSQL major version is never surfaced and the upgrade is easy to forget. The upgrade still needs a data migration and a matching PostgreSQL client in the backup image, so it must never merge on its own — but it should be visible as a pull request. Major updates are already not auto-merged (automerge is only enabled for minor and patch), so removing the ignore rule is enough.

## What Changes

- Remove the `postgres` major package rule from the Renovate configuration, so Renovate opens a pull request for a new major version of the `postgres` image.
- That pull request is not merged automatically (existing behavior for all major updates); the owner merges it by hand after doing the migration and upgrading the backup client.
- Minor and patch updates of `postgres` keep merging automatically, as before.

## Capabilities

### New Capabilities

### Modified Capabilities
- `pipeline`: the requirement "Renovate keeps dependencies and Docker images up to date" is replaced by "Renovate opens pull requests for outdated dependencies and images", which no longer ignores major `postgres` updates.

## Impact

- `.github/renovate.json5`: the `postgres` major package rule is deleted.
- `openspec/specs/pipeline/spec.md` (via delta spec).
- No application code, image tags or Dockerfiles change; the first Postgres major pull request appears on the next Renovate run.
