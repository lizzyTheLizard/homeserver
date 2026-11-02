# Proposal

## Why

The development machine never deploys from main: the run for #405 published its image, but skipped `Dev Machine / Deploy`, as did the run for #404. The service workflow's deploy job has a plain `if: inputs.deploy`. GitHub therefore adds an implicit `success()`, which checks the whole chain of earlier jobs, not only the build. The development machine has no lint and no test job; both are skipped, so the deploy is skipped too, even though `deploy: true` was passed in. Services with lint and tests are not affected.

## What Changes

- The deploy job in `.github/workflows/service.yml` runs when deploy was requested and its build succeeded. A skipped lint or test job no longer blocks it. A failed or cancelled lint, test or build still does.
- The pipeline spec states explicitly that a service without lint or test is still deployed.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `pipeline`: the "Changed services are deployed from main" requirement now covers services without lint or tests. Their deploy depends only on the image publish.

## Impact

- `.github/workflows/service.yml`: the `deploy` job condition.
- Merging this change touches the pipeline definition, so the next main run reports every service and the infrastructure as changed and deploys the whole stack once. That also recreates the development machine from the image published by #405, which ends running Remote Control sessions.
- The per-service dev-machine deploy itself is only exercised by the next change that touches `services/dev-machine/` alone.
