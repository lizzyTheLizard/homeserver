# Tasks

## 1. Renovate configuration

- [ ] 1.1 In `.github/renovate.json5` delete the `postgres` major package rule (including its comment) and verify with `pnpm dlx --package renovate renovate-config-validator .github/renovate.json5` (or the validator available in the repo) that the config is valid and that no rule enables automerge for major updates

## Workflow follow-up

- Archive the change after review; after merge the next Renovate run opens the Postgres major pull request if a newer major exists. Merge it by hand once the data migration and a matching PostgreSQL client in `infrastructure/db-backup` are ready.
