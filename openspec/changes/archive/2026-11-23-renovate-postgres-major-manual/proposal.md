# Proposal

## Why

Renovate currently ignores major `postgres` image updates (`enabled: false`), so a new PostgreSQL major version is never surfaced and the upgrade is easy to forget. The upgrade still needs a data migration and a matching PostgreSQL client in the backup image, so it must never merge on its own — but it should be visible as a pull request. Major updates are already not auto-merged (automerge is only enabled for minor and patch), so the rule only needs to stop ignoring them and add the warning.

## What Changes

- Change the `postgres` major package rule in the Renovate configuration from ignoring the update to proposing it, so Renovate opens a pull request for a new major version of the `postgres` image.
- That pull request is not merged automatically (existing behavior for all major updates); the owner merges it by hand after doing the migration and upgrading the backup client.
- That pull request carries a conspicuous warning: a title prefix and a warning at the top of the description, saying that a data migration and a matching PostgreSQL client in `infrastructure/db-backup` are required before merging.
- Minor and patch updates of `postgres` keep merging automatically, as before.

## Capabilities

### New Capabilities

### Modified Capabilities
- `pipeline`: the requirement "Renovate keeps dependencies and Docker images up to date" is replaced by "Renovate opens pull requests for outdated dependencies and images", which no longer ignores major `postgres` updates.

## Impact

- `.github/renovate.json5`: the `postgres` major package rule no longer disables the update; it sets the warning title prefix and description header.
- `infrastructure/db-backup/Dockerfile`: the comment no longer says Renovate ignores Postgres major updates.
- `openspec/specs/pipeline/spec.md` (via delta spec).
- No application code, image tags or Dockerfiles change; the first Postgres major pull request appears on the next Renovate run.
