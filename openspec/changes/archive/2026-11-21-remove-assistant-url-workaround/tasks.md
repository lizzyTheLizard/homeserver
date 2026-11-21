# Tasks

## 1. Remove the workaround

- [x] 1.1 Remove `ASSISTANT_INTERNAL_URL` and its comment from the `applicationprod` environment in `infrastructure/docker-compose.yml`, and verify `grep -rn ASSISTANT_INTERNAL_URL` finds nothing outside the OpenSpec archive

## Workflow follow-up

- Archive the change before opening the pull request.
- Verify in the pull request that the Start stack job starts the published web image without the variable and every container becomes healthy.
