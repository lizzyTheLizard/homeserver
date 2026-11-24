# Design

## Context

`services/dev-machine/Dockerfile` is built in CI (`linux/amd64`, context = repo root) and has no local build path in the development environment. The Node version lives in `.nvmrc` and, duplicated, in the `FROM` lines of every Dockerfile. Renovate tracks the `FROM` image via its default Dockerfile manager (see `renovate.json5`, extends `config:recommended`); other installs are not tracked.

## Goals / Non-Goals

**Goals:** fewer, uniform install steps; every tool pinned and Renovate-tracked; unchanged runtime behavior.

**Non-Goals:** changing entrypoint, supervisord, sshd, the `dev` user or the volume layout; pre-installing Playwright browsers; replacing code-server.

## Decisions

- **Base `buildpack-deps:noble`, Node from `.nvmrc`.** `buildpack-deps` is the official fat Ubuntu 24.04 LTS image (git, curl, ca-certificates, build tools; the same layer the `node` images are built on), so the apt list stays small: openssh-server, postgresql-client, supervisor, sudo, vim, rsync, net-tools, zip, unzip. Ubuntu 24.04 is a supported Playwright `install-deps` platform and ships `postgresql-client-16`, matching the production PostgreSQL 16. Renovate tracks the tag. Alternatives: plain `ubuntu:24.04` is leaner but would need `ca-certificates`, `curl`, `git` and `xz-utils` added again; `node:*-bookworm` pins Node in a second place next to `.nvmrc`; the devcontainers Node image uses a uid-1000 `node` user and a major-only tag, which would also require migrating `dev_home` ownership.
- **Node from `.nvmrc`, no `ARG`.** The Dockerfile does `COPY .nvmrc` (the build context is the repo root and `.dockerignore` does not exclude it), downloads `node-$(cat .nvmrc)-linux-<arch>.tar.xz` from nodejs.org (`TARGETARCH` amd64 -> x64, arm64 -> arm64), verifies it against the release's `SHASUMS256.txt` and unpacks it to `/usr/local`. `.nvmrc` stays the single source; Renovate's built-in `nvm` manager already updates it. A change to `.nvmrc` already rebuilds the dev machine in CI (`.nvmrc` is in `SHARED_WORKSPACE_FILES` of `.github/scripts/detect-changes.mjs`, covered by `detect-changes.test.mjs`), so nothing changes in the pipeline.
- **Considered: mise.** `mise` reads `.nvmrc` and could install Node, pnpm, gh and the npm tools from one `mise.toml` that Renovate also understands. Not chosen: code-server and the Playwright system dependencies still need separate handling, and it adds a tool layer to the image. Can be revisited.
- **One mechanism for versions: `ARG` + `# renovate:` comment + `customManagers:dockerfileVersions`.** The preset is built into Renovate, needs no regex of our own, and handles both `npm` and `github-releases` datasources. Alternative: a `package.json` + lockfile for the npm tools — covers only npm (not gh, code-server) and adds a lockfile to maintain.
- **GitHub CLI from the release tarball** (`gh_<v>_linux_<arch>.tar.gz`, unpacked to `/usr/local`), architecture via `TARGETARCH`. This removes the apt repo, keyring and extra `apt-get update`. Debian's own `gh` is too old.
- **code-server: keep, install the pinned `.deb`** from the GitHub release via `apt-get install ./file.deb`. It is Coder's official self-hosted VS Code and the de-facto standard; OpenVSCode Server offers no advantage here and `code serve-web` requires Microsoft's service terms and a tunnel/auth flow. The install script only wraps the same `.deb` download.
- **npm tools in one `RUN`:** `npm install -g pnpm@… @anthropic-ai/claude-code@… @fission-ai/openspec@…`. Claude Code is kept on npm (pinned, reproducible, Renovate-visible) rather than the self-updating native installer.
- **Playwright:** `npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium` stays, with the version now an annotated `ARG` that Renovate keeps in step with `services/web`. Only OS libraries are installed; browsers stay on-demand.

## Risks / Trade-offs

- [Image cannot be built locally] → CI builds it in the pull request and the stack start check boots it; review the Dockerfile closely.
- [Release asset names change upstream] → the build fails loudly in the Renovate pull request, which is then not merged.
- [Larger base image] → accepted; it is an interactive machine pulled rarely.
- [Node download fails or is tampered with] → checksum verification against `SHASUMS256.txt` fails the build.
- [`.nvmrc` has a `v` prefix, the download URL needs it too] → use the file content verbatim (`v26.13.1`).
- [More Renovate pull requests] → minor/patch automerge under the existing rule.
