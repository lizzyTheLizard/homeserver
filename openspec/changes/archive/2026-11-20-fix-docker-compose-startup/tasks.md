# Tasks

## 1. Name server

- [x] 1.1 In `infrastructure/docker-compose.yml`, change the bind9 image to `internetsystemsconsortium/bind9:9.20`
- [x] 1.2 Add `chmod 644 /etc/bind/db.gutschi.site` to the bind9 command between the `sed` and the `exec named` lines

- [x] 1.3 Set the name server's working directory in `infrastructure/bind9/named.conf` to a writable path (`/tmp`), found by the stack start-up stage

## 2. Pipeline

- [x] 2.1 Add the `stack-start` job to `.github/workflows/pipeline.yml` (infrastructure changed, after all service jobs, GHCR login, `.env` from `env.example`, `docker compose up -d --wait --wait-timeout 300`, diagnostics on failure, `down -v` always)
- [x] 2.2 Add `stack-start` to the `needs` of `deploy-infrastructure` and `quality-gate`
- [x] 2.3 Run the pipeline script tests (`node --test '.github/scripts/*.test.mjs'`) and validate the compose file with `docker compose config`
- [x] 2.5 Add the missing `MICROSOFT_GRAPH_ISSUER` placeholder to `infrastructure/env.example`, found by the stack start-up stage
- [x] 2.6 Pass `SKIP_GITHUB_BOOTSTRAP` to the development machine in the compose file (default `0`) and set it to `1` in the pipeline's placeholder `.env`, found by the stack start-up stage
- [ ] 2.4 Verify the stage on the pull request; adjust placeholder values only if a container is unhealthy for configuration reasons
