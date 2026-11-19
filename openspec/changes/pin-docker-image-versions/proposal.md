# Proposal

## Why

Dependabot already keeps the npm packages and GitHub Actions up to date, but the Docker images are not covered: the Dockerfiles use floating tags (`node:24-alpine`, `alpine:3.20`) and the compose stack uses floating or even `latest`/untagged references (`nginx:alpine`, `sosedoff/pgweb`, `amir20/dozzle:latest`, `ubuntu/bind9:latest`, `certbot/certbot:latest`). A deploy can silently pick up a different image than the one tested, and base-image updates never show up as reviewable pull requests.

## What Changes

- Pin every image that is loaded from outside the repository to an exact version tag in `infrastructure/docker-compose.yml` and in all Dockerfiles (`services/web`, `services/assistant`, `services/whatsapp`, `services/wichteln`, `services/dev-machine`, `infrastructure/db-backup`), including the `alpine` stage of the WhatsApp bridge.
- Images built by this repository (`ghcr.io/lizzythelizard/homeserver-*`) stay on `latest`.
- Extend `.github/dependabot.yml` with the `docker` ecosystem for every directory containing a Dockerfile and the `docker-compose` ecosystem for `infrastructure/`, using the same weekly schedule as the other ecosystems, so image updates arrive as pull requests that the existing auto-merge workflow handles like any other dependency update.
- Ignore major-version updates of `postgres` (a major upgrade needs a data migration and must match the `postgresql16-client` in the backup image) and keep major bumps of other images as manual reviews (the auto-merge workflow only merges patch and minor updates).

## Capabilities

### New Capabilities

### Modified Capabilities
- `infrastructure`: externally loaded images in the compose stack are pinned to exact versions.
- `pipeline`: Docker images built from the Dockerfiles use pinned base images, and Dependabot checks Docker and docker-compose dependencies.

## Impact

- `infrastructure/docker-compose.yml`, all six Dockerfiles, `.github/dependabot.yml`.
- Deployments (the `infrastructure` change redeploys the whole stack) will pull the pinned versions once; behaviour should be unchanged apart from the chosen versions.
- More Dependabot pull requests (docker + docker-compose, weekly).
- Not in scope: the `WACLI_VERSION` build arguments, apt/apk packages and `npm install -g` calls inside the Dockerfiles; Dependabot cannot track them.
