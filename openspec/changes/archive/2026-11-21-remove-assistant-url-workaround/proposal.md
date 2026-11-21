# Proposal

## Why

`remove-assistant-service` kept `ASSISTANT_INTERNAL_URL` in the `applicationprod` environment as a temporary workaround: the stack check of a pull request starts the previously published web image, which still required the variable at startup. The new web image has been published and no longer reads it, so the workaround is dead configuration.

## What Changes

- Remove `ASSISTANT_INTERNAL_URL` and its explanatory comment from the `applicationprod` environment in `infrastructure/docker-compose.yml`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The assistant service no longer exists in any spec, and no requirement mentions this variable, so this is configuration cleanup only (`skip_specs: true`).

## Impact

- `infrastructure/docker-compose.yml` only. The web container no longer receives a variable it does not read.
