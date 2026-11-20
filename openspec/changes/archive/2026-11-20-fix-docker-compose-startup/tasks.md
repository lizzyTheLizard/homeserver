# Tasks

## 1. Name server

- [x] 1.1 In `infrastructure/docker-compose.yml`, change the bind9 image to `internetsystemsconsortium/bind9:9.20`
- [x] 1.2 Add `chmod 644 /etc/bind/db.gutschi.site` to the bind9 command between the `sed` and the `exec named` lines

## 2. Pipeline

- [x] 2.1 Add the `stack-start` job to `.github/workflows/pipeline.yml` (infrastructure changed, after all service jobs, GHCR login, `.env` from `env.example`, `docker compose up -d --wait --wait-timeout 300`, diagnostics on failure, `down -v` always)
- [x] 2.2 Add `stack-start` to the `needs` of `deploy-infrastructure` and `quality-gate`
- [x] 2.3 Run the pipeline script tests (`node --test '.github/scripts/*.test.mjs'`) and validate the compose file with `docker compose config`
- [ ] 2.4 Verify the stage on the pull request; adjust placeholder values only if a container is unhealthy for configuration reasons
