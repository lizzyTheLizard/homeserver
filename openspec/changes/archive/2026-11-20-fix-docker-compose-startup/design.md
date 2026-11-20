# Design

## Context

`infrastructure/docker-compose.yml` defines the whole stack; nine services already carry health checks. The bind9 service writes `/etc/bind/db.gutschi.site` with `sed` from a read-only template and runs `named -g`. Own images are `ghcr.io/lizzythelizard/homeserver-*:latest`, published by `service.yml` only on main; `deploy-infrastructure` already waits for all service jobs. `infrastructure/env.example` holds placeholder values for every variable the stack needs.

## Goals / Non-Goals

**Goals:**
- A broken stack definition is caught in the pull request, before it is deployed.
- Start-up only: `docker compose up --wait` semantics.

**Non-Goals:**
- Functional checks (DNS answers, HTTP responses, login).
- Adding health checks to services that have none.

## Decisions

- **Image**: `internetsystemsconsortium/bind9:9.20`, as requested. It is only published with a floating `9.20` tag, so the pinning rule gets a narrow exception (see spec delta) instead of silently violating it. The ISC image runs `named` as the `bind` user, hence the `chmod 644` after `sed`. The command stays `named -g -c /etc/bind/named.conf`; if the ISC image's `named` path or user needs a different invocation, that is found by the new stage.
- **New job `stack-start`** in `pipeline.yml` (not in `service.yml`): runs on `ubuntu-latest`, `if` infrastructure changed, `needs` all service jobs with the same `always()` + no failure/cancelled guard as `deploy-infrastructure`. Steps: checkout, `cp infrastructure/env.example infrastructure/.env`, log in to GHCR, `docker compose pull`, `docker compose up -d --wait --wait-timeout 300`; on failure `docker compose ps` and `logs` are printed; `docker compose down -v` always runs.
- **Gating**: `deploy-infrastructure` and `quality-gate` add `stack-start` to `needs`; the deploy's guard already rejects failed/cancelled needs.
- **Images**: on a pull request the service images are not published, so the stage uses the `latest` images from GHCR (the currently deployed ones) and builds `dev-db`-style local images through the compose `build:` section. This tests the stack definition, not unmerged service code; accepted trade-off.
- **Permissions**: `packages: read` to pull from GHCR with `GITHUB_TOKEN`.

## Risks / Trade-offs

- Placeholder `.env` values may make a service unhealthy for configuration reasons (e.g. Azure OIDC discovery needing network); such services are fixed by adjusting the placeholders, not by dropping the check. The first run is the verification.
- The floating `9.20` tag can change under us; the start-up stage limits the blast radius.
- Services with no health check are only checked for "running".
- Port 53 and 80/443 on the runner could clash with runner services; to be verified on first run.
