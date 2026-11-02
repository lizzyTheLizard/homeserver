# Proposal

## Why

Two parts of the new per-service workflow setup do not work well:

- Orphan containers are not removed and the other stack containers are not force-recreated. The infrastructure deploy action already runs `docker compose up -d --force-recreate --remove-orphans`. But the Infrastructure workflow only triggers on `infrastructure/**`. A change to the deploy action or to the workflow itself never runs a full-stack redeploy, so the stack never gets cleaned up.
- Claude Code Remote Control on the dev-machine does not start sessions correctly. It runs with `--spawn session` instead of `--spawn same-dir`.

## What Changes

- The Infrastructure workflow also triggers when its own workflow file or the `deploy-infrastructure` action changes. Every such push to `main` then recreates the whole stack with `--force-recreate --remove-orphans`.
- The dev-machine starts Claude Code with `claude remote-control --spawn same-dir`, so spawned sessions run in `/home/dev/workspace`.
- The infrastructure spec now states the full-stack deploy behaviour (recreate everything, remove orphans), which is not written down anywhere yet.

Assumption: service deploys (`deploy-service`) keep recreating only their own service. Only the infrastructure deploy recreates the whole stack. The user did not answer the clarifying question on this, so this is the narrowest reading of the request.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `infrastructure`: adds a requirement that an infrastructure deploy recreates every service of the stack and removes orphan containers, and that it runs whenever the stack definition or its own deploy definition changes.
- `dev-machine`: the Remote Control requirement states that sessions are spawned in the repository directory (same-dir mode).

## Impact

- `.github/workflows/infrastructure.yml`: `paths` trigger
- `services/dev-machine/supervisord.conf`: `claude-remote-control` program command
- Deploys: the first push of this change to `main` triggers a full-stack redeploy through the Infrastructure workflow and a dev-machine redeploy through the Dev Machine workflow.
