# Tasks

## 1. Pin external images

- [x] 1.1 Look up the latest stable exact tags (keeping variant and major line) for `node`, `alpine`, `nginx`, `postgres`, `sosedoff/pgweb`, `amir20/dozzle`, `caddy`, `ubuntu/bind9` and `certbot/certbot`
- [x] 1.2 Pin all external images in `infrastructure/docker-compose.yml`, leaving `ghcr.io/lizzythelizard/homeserver-*` on `latest`
- [x] 1.3 Pin the `FROM` images in the Dockerfiles of web, assistant, whatsapp (incl. the `alpine` stage and `node:*-slim` runner), wichteln, dev-machine and db-backup
- [x] 1.4 Update the comment in `infrastructure/db-backup/Dockerfile` to state that `postgresql16-client` must follow the pinned `postgres` major

## 2. Dependabot

- [x] 2.1 Add a `docker` ecosystem entry in `.github/dependabot.yml` for the six Dockerfile directories (weekly, same cooldown as npm)
- [x] 2.2 Add a `docker-compose` ecosystem entry for `/infrastructure` (weekly)
- [x] 2.3 Ignore semver-major updates of `postgres` in the `docker-compose` entry

## 3. Verify

- [x] 3.1 Validate the compose file with `docker compose config` and build one Dockerfile locally if Docker is available; otherwise confirm each tag exists on its registry
- [x] 3.2 Confirm every external image in the repository is pinned (grep `FROM` / `image:`) and run `openspec validate pin-docker-image-versions`
