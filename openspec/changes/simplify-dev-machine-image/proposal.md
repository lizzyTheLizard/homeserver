# Proposal

## Why

The dev-machine Dockerfile installs its tooling in five different ways (apt packages, an apt repository for GitHub CLI, `npm install -g` with and without versions, a `curl | sh` installer for code-server, `npx` for Playwright's system dependencies). Most of these are invisible to Renovate: `openspec` follows `@latest`, Playwright is pinned to 1.63.0 while the repository already uses 1.65, and GitHub CLI and code-server are unpinned. The file is longer than it needs to be and the tools silently drift.

## What Changes

- Base the image on the full `node:<version>-bookworm` instead of `-slim`, and drop the apt packages it already contains (`ca-certificates`, `curl`, `git`, `procps`, `tar`, `gzip`).
- Install GitHub CLI from its pinned release tarball instead of adding its apt repository and signing key.
- Install code-server from its pinned release `.deb` instead of piping the install script into a shell. code-server stays the browser IDE.
- Install pnpm, Claude Code and OpenSpec with one pinned `npm install -g`; pin OpenSpec (was `@latest`); use the pinned Playwright version for the OS dependencies.
- Declare every pinned tool as a Dockerfile `ARG` with a `# renovate:` annotation and enable Renovate's `customManagers:dockerfileVersions` preset so Renovate proposes updates for all of them.
- Fix the stale `AGENTS.md` reference in a Dockerfile comment (it is `CLAUDE.md`).

No runtime behavior of the machine changes (user, entrypoint, SSH, supervisord, ports).

## Capabilities

### New Capabilities

### Modified Capabilities
- `pipeline`: Renovate additionally covers tool versions pinned in Dockerfiles through annotated `ARG`s.

## Impact

- `services/dev-machine/Dockerfile`, `renovate.json5`.
- New Renovate pull requests for the dev-machine tools; minor/patch ones automerge under the existing rule.
- The image grows by the extra packages in the non-slim base image (acceptable for an interactive machine); it cannot be built in the development environment, so the CI image build is the check.
