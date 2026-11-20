# Proposal

## Why

The docker-compose stack does not start properly: the name server container fails (the generated zone file is not readable by the `named` user under the current `ubuntu/bind9` image), and nothing in the pipeline would notice, because the stack is only ever started on the production host after merging.

## What Changes

- Replace the name server image `ubuntu/bind9:9.20-26.04` with `internetsystemsconsortium/bind9:9.20`.
- Make the generated zone file readable by adding `chmod 644 /etc/bind/db.gutschi.site` to the bind9 command, after the `sed` that creates it.
- Let the name server run from a working directory that its non-root user can write (`directory "/tmp"` in `named.conf`), which the new image requires.
- Add the missing `MICROSOFT_GRAPH_ISSUER` placeholder to `infrastructure/env.example`, without which the assistant exits at start-up.
- Pass the development machine's existing `SKIP_GITHUB_BOOTSTRAP` switch through the compose file (default `0`, so production is unchanged) so the start-up check does not need a GitHub SSH key.
- Have the start-up check create self-signed placeholder TLS certificates, since nginx cannot start without the certificates certbot issues on the real host.
- Add a pipeline job that runs `docker compose up` for the stack and passes only once every container is running and healthy. No further checks (no DNS queries, no HTTP requests).
- The new job runs when the infrastructure is reported as changed, after the changed service images are built and published, and gates the infrastructure deploy and the "Quality Gate".

## Capabilities

### New Capabilities

### Modified Capabilities
- `infrastructure`: the DNS server image and start-up command; the exact-version pinning rule gets an explicit exception for the name server image, which is only published with a floating `9.20` tag.
- `pipeline`: a new stack start-up check stage.

## Impact

- `infrastructure/docker-compose.yml` (bind9 service), `infrastructure/bind9/named.conf`, `infrastructure/env.example`
- `.github/workflows/pipeline.yml` (new job, `deploy-infrastructure` and `quality-gate` dependencies)
- Dependabot will not propose bind9 updates beyond the `9.20` line; the image follows 9.20 patch releases on pull.
