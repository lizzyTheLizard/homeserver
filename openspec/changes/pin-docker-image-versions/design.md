# Design

## Context

`.github/dependabot.yml` has `npm` and `github-actions` entries. Dependabot's `docker` ecosystem reads one directory per entry (Dockerfiles only, `FROM` lines, including `COPY --from=<image>`), and its `docker-compose` ecosystem reads `docker-compose.yml` `image:` lines. Currently external images are floating: `node:24-alpine` (5 Dockerfiles, plus `node:24-slim` and `node:24-bookworm-slim`), `alpine:3.20`, and in compose `nginx:alpine`, `postgres:16-alpine` (twice), `sosedoff/pgweb`, `amir20/dozzle:latest`, `caddy:2-alpine`, `ubuntu/bind9:latest`, `certbot/certbot:latest`. The auto-merge workflow merges only semver patch and minor updates after the "Quality Gate".

## Goals / Non-Goals

**Goals:**
- Reproducible builds and deploys: every external image has an exact tag.
- Image updates arrive as Dependabot pull requests, reviewed by the same gate as npm updates.

**Non-Goals:**
- Digest pinning (`@sha256:`); exact tags were requested and are more readable.
- Tracking `WACLI_VERSION`, apt/apk packages or globally installed npm tools in Dockerfiles.
- Changing images built from this repository (they stay `latest`).

## Decisions

- **Exact tag with variant suffix**: e.g. `node:24.x.y-alpine3.z`, `postgres:16.x-alpine3.z`, `caddy:2.x.y-alpine`. Concrete versions are looked up on the registries at apply time (latest stable at that time, keeping the current variant/OS flavour and major line). Dependabot keeps the suffix and proposes newer tags of the same shape. Alternative (major-only tags) rejected: not fixed.
- **One `docker` entry per Dockerfile directory** (`/services/web`, `/services/assistant`, `/services/whatsapp`, `/services/wichteln`, `/services/dev-machine`, `/infrastructure/db-backup`) plus one `docker-compose` entry for `/infrastructure`. Dependabot supports `directories` lists, so one entry with `directories` per ecosystem is used to avoid repetition. Same weekly interval as the existing entries, with the same `cooldown` as npm.
- **Postgres major ignored**: `ignore` with `update-types: ["version-update:semver-major"]` for `postgres` in both ecosystems; the major must stay in step with `postgresql16-client` in `infrastructure/db-backup/Dockerfile` and needs a data migration. The Dockerfile comment is updated to state that coupling.
- **Node major updates** remain proposed but are not auto-merged by the existing workflow; they are reviewed manually. The Node version also appears in `.nvmrc` and the CI setup, which Dependabot does not align, so a major bump needs manual follow-up anyway.
- **Own images stay `latest`**: deploy relies on `docker compose pull` of the freshly built image.

## Risks / Trade-offs

- More weekly pull requests (up to the image count) → patch/minor ones are auto-merged and each triggers a full-stack deploy when `infrastructure/` changes; mitigated by weekly batching and cooldown. 
- Dependabot may open a PR for a Node patch per Dockerfile separately → accepted; auto-merge handles them.
- Pinned tag may disappear from a registry → unlikely for exact release tags; the build would fail loudly in CI.
- Dependabot `ubuntu/bind9` and `sosedoff/pgweb` use non-semver or date-like tags in places → versions chosen at apply time are verified to be semver-like so updates are proposed; if not, note it in the review.
