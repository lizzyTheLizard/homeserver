# Proposal

## Why

The dev-machine pins Node in its `FROM` line, a second copy of the version in `.nvmrc`, and installs its tooling in five different ways (apt packages, an apt repository for GitHub CLI, `npm install -g` with and without versions, a `curl | sh` installer for code-server, `npx` for Playwright's system dependencies). Most of these are invisible to Renovate: `openspec` follows `@latest`, Playwright is pinned to 1.63.0 while the repository already uses 1.65, and GitHub CLI and code-server are unpinned. The file is longer than it needs to be and the tools silently drift.

## What Changes

- Base the image on the official `ubuntu:noble-<date>` (Ubuntu 24.04 LTS, exact dated tag) instead of `node:*-bookworm-slim`, install the utilities, SSH server, supervisor and PostgreSQL client with apt, and install Node from the official tarball for the version in the repository's `.nvmrc`, so the whole repository, including the dev machine, has one Node version source.
- Install GitHub CLI from its pinned release tarball instead of adding its apt repository and signing key.
- Install code-server with its install script in the standalone method at a pinned version, which needs no apt step. code-server stays the browser IDE.
- Install pnpm (in the range of `package.json`), Claude Code and OpenSpec with one `npm install -g`; pin OpenSpec (was `@latest`); install Playwright's OS dependencies with the current Playwright release, since the version only selects the package list.
- Declare every pinned tool as a Dockerfile `ARG` with a `# renovate:` annotation and enable Renovate's `customManagers:dockerfileVersions` preset so Renovate proposes updates for all of them.
- Fix the stale `AGENTS.md` reference in a Dockerfile comment (it is `CLAUDE.md`).

- **BREAKING:** run as the base image's default user `ubuntu` (uid 1000, home `/home/ubuntu`) and drop the custom `dev` user (uid 1234, home `/home/dev`). The SSH login user, the home path in `supervisord.conf`, `entrypoint.sh`, `sshd_config`, the volume mount in `docker-compose.yml` and the documentation change with it.
- **BREAKING:** do not carry the existing `dev_home` volume over (its ownership and `/home/dev` paths are incompatible): the compose file mounts a new volume `dev_machine_home` at `/home/ubuntu`, which starts empty and persists across deployments as before. The old volume stays on the server unused. The first start needs the new SSH key registered with GitHub and one `claude /login`, see the design.
- Install only the apt packages the machine needs (no `rsync`, `net-tools`, `zip`, `unzip`).

Everything else about the machine (entrypoint behavior, SSH, supervisord programs, ports) is unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities
- `pipeline`: Renovate additionally covers tool versions pinned in Dockerfiles through annotated `ARG`s.
- `dev-machine`: the SSH login user is `ubuntu` instead of `dev`.

## Impact

- `services/dev-machine/` (Dockerfile, `entrypoint.sh`, `supervisord.conf`, `sshd_config`), `infrastructure/docker-compose.yml`, `.github/renovate.json5`, `README.md`, `CLAUDE.md`, `infrastructure/README.md` (user and home path). `.nvmrc` is already a shared workspace file that triggers the dev-machine image build.
- New Renovate pull requests for the dev-machine tools; minor/patch ones automerge under the existing rule.
- The first deployment starts the dev machine on an empty home volume: it needs its new SSH key registered with GitHub and a fresh `claude /login` (see the design). The old `dev_home` volume is left unused.
- It cannot be built in the development environment, so the CI image build is the check.
