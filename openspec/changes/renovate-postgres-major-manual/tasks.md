# Tasks

## 1. Renovate configuration

- [x] 1.1 In `.github/renovate.json5` change the `postgres` major package rule from `enabled: false` to `automerge: false` with a `commitMessagePrefix` warning of the required data migration and a `prHeader` warning (cautioning not to merge before the migration and the backup client upgrade); verify with `renovate-config-validator` that the config is valid
- [x] 1.2 Update the comment in `infrastructure/db-backup/Dockerfile` that says Renovate ignores Postgres major updates; verify by reading the comment

## Workflow follow-up

- Archive the change after review; after merge the next Renovate run opens the Postgres major pull request if a newer major exists. Merge it by hand once the data migration and a matching PostgreSQL client in `infrastructure/db-backup` are ready.
