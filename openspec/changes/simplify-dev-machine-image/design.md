# Design

## Context

`services/dev-machine/Dockerfile` is built in CI (`linux/amd64`, context = repo root) and has no local build path in the development environment. Renovate already tracks the `FROM` image via its default Dockerfile manager (see `renovate.json5`, extends `config:recommended`); other installs are not tracked.

## Goals / Non-Goals

**Goals:** fewer, uniform install steps; every tool pinned and Renovate-tracked; unchanged runtime behavior.

**Non-Goals:** changing entrypoint, supervisord, sshd, the `dev` user or the volume layout; pre-installing Playwright browsers; replacing code-server.

## Decisions

- **Base `node:26.13.1-bookworm` (full).** It ships git, curl, ca-certificates, procps and archive tools, so those apt entries go. Still needed from apt: openssh-server, postgresql-client, supervisor, sudo, vim, rsync, net-tools, zip, unzip. Alternatives: `mcr.microsoft.com/devcontainers/javascript-node` covers even more (sudo, rsync, zip) but uses a `node` user with uid 1000 and a major-only tag that does not follow `.nvmrc` exactly; not worth the migration of the `dev_home` volume ownership. Keep `bookworm` (not trixie) to stay on the current distro.
- **One mechanism for versions: `ARG` + `# renovate:` comment + `customManagers:dockerfileVersions`.** The preset is built into Renovate, needs no regex of our own, and handles both `npm` and `github-releases` datasources. Alternative: a `package.json` + lockfile for the npm tools — covers only npm (not gh, code-server) and adds a lockfile to maintain.
- **GitHub CLI from the release tarball** (`gh_<v>_linux_<arch>.tar.gz`, unpacked to `/usr/local`), architecture via `TARGETARCH`. This removes the apt repo, keyring and extra `apt-get update`. Debian's own `gh` is too old.
- **code-server: keep, install the pinned `.deb`** from the GitHub release via `apt-get install ./file.deb`. It is Coder's official self-hosted VS Code and the de-facto standard; OpenVSCode Server offers no advantage here and `code serve-web` requires Microsoft's service terms and a tunnel/auth flow. The install script only wraps the same `.deb` download.
- **npm tools in one `RUN`:** `npm install -g pnpm@… @anthropic-ai/claude-code@… @fission-ai/openspec@…`. Claude Code is kept on npm (pinned, reproducible, Renovate-visible) rather than the self-updating native installer.
- **Playwright:** `npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium` stays, with the version now an annotated `ARG` that Renovate keeps in step with `services/web`. Only OS libraries are installed; browsers stay on-demand.

## Risks / Trade-offs

- [Image cannot be built locally] → CI builds it in the pull request and the stack start check boots it; review the Dockerfile closely.
- [Release asset names change upstream] → the build fails loudly in the Renovate pull request, which is then not merged.
- [Larger base image] → accepted; it is an interactive machine pulled rarely.
- [More Renovate pull requests] → minor/patch automerge under the existing rule.
