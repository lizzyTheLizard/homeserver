# Design

## Context

`services/dev-machine/Dockerfile` is built in CI (`linux/amd64`, context = repo root) and has no local build path in the development environment. The Node version lives in `.nvmrc` and, duplicated, in the `FROM` lines of every Dockerfile. Renovate tracks the `FROM` image via its default Dockerfile manager (see `renovate.json5`, extends `config:recommended`); other installs are not tracked.

## Goals / Non-Goals

**Goals:** fewer, uniform install steps; every tool pinned and Renovate-tracked; unchanged runtime behavior except the user switch below.

**Non-Goals:** changing the behavior of entrypoint, supervisord and sshd beyond the user and home path, or the volume layout; pre-installing Playwright browsers; replacing code-server.

## Decisions

- **Base `ubuntu:noble-<date>`, Node from `.nvmrc`.** Official Ubuntu 24.04 LTS with exact dated tags (required by the pipeline spec) that Renovate updates, and nothing preinstalled that we did not ask for. It is a supported Playwright `install-deps` platform and ships `postgresql-client-16`, matching the production PostgreSQL 16. The image is minimal, so apt installs `ca-certificates`, `curl`, `git`, `xz-utils`, `sudo`, `procps`, the SSH client and server, `postgresql-client`, `supervisor` and `vim`; `LANG=C.UTF-8` is set explicitly. Alternatives: `mcr.microsoft.com/devcontainers/base` (preinstalled tools, but Microsoft's choices such as an unused `vscode` user and extra packages, and its contents could not be inspected here); `buildpack-deps:noble` (fat, but only floating tags, which the "Docker base images are pinned to exact versions" requirement forbids); `node:*-bookworm` (pins Node in a second place next to `.nvmrc`).
- **Run as the base image's `ubuntu` user (uid 1000), drop `dev`.** One user fewer to create; `ubuntu` only gets passwordless sudo (one sudoers line). The user, `/home/ubuntu` paths change in `Dockerfile`, `supervisord.conf` (`user=`, socket, log and pid files, code-server and Remote Control directories), `entrypoint.sh`, `sshd_config` (`AllowUsers`), `docker-compose.yml`, the READMEs and `CLAUDE.md`. The home volume is replaced by a fresh one (next decision). The dev-machine spec's SSH requirement names the user, so it is modified.
- **Fresh home volume under a new name, old one not migrated.** The existing `dev_home` volume is owned by uid 1234 and its contents refer to `/home/dev` (git worktree metadata, Claude Code's per-project data keyed by path), so it is not compatible with the `ubuntu` user and the new home path. Instead of converting it, the compose file mounts a new volume `dev_machine_home` at `/home/ubuntu`; Docker initializes it from the image's `/home/ubuntu`, so it is owned by `ubuntu` from the start. From then on the volume persists across deployments as before. Alternative: keep the name `dev_home` and delete the old volume by hand before deploying; rejected because forgetting that step leaves a container that cannot write its home, while a new name makes the first deployment work by itself and keeps the old data for rollback.
- **Node from `.nvmrc`, no `ARG`.** The Dockerfile copies `.nvmrc` (the build context is the repo root and `.dockerignore` does not exclude it), streams `node-$(cat .nvmrc)-linux-x64.tar.xz` from nodejs.org into `tar` (all images are built for `linux/amd64` only) and unpacks it to `/usr/local`. No checksum is verified, consistent with the other downloaded tools (gh, code-server); the download is protected by HTTPS only. `.nvmrc` stays the single source; Renovate's built-in `nvm` manager already updates it. A change to `.nvmrc` already rebuilds the dev machine in CI (`.nvmrc` is in `SHARED_WORKSPACE_FILES` of `.github/scripts/detect-changes.mjs`, covered by `detect-changes.test.mjs`), so nothing changes in the pipeline.
- **Considered: mise.** `mise` reads `.nvmrc` and could install Node, pnpm, gh and the npm tools from one `mise.toml` that Renovate also understands. Not chosen: code-server and the Playwright system dependencies still need separate handling, and it adds a tool layer to the image. Can be revisited.
- **One mechanism for versions: `ARG` + `# renovate:` comment + `customManagers:dockerfileVersions`.** The preset is built into Renovate, needs no regex of our own, and handles both `npm` and `github-releases` datasources. Alternative: a `package.json` + lockfile for the npm tools — covers only npm (not gh, code-server) and adds a lockfile to maintain.
- **GitHub CLI from the release tarball** (`gh_<v>_linux_<arch>.tar.gz`, unpacked to `/usr/local`). This removes the apt repo, keyring and extra `apt-get update`. Debian's own `gh` is too old.
- **code-server: keep, install with its official `install.sh`** using `--method=standalone --prefix=/usr/local --version=<ARG>`. That installs the release tarball (which bundles its own Node) under `/usr/local/lib/code-server-<v>` and links `/usr/local/bin/code-server`, so no apt step and no distro-specific `.deb`; the version stays pinned and Renovate-tracked, only the installer script itself is not pinned. It is Coder's official self-hosted VS Code and the de-facto standard; OpenVSCode Server offers no advantage here and `code serve-web` requires Microsoft's service terms and a tunnel/auth flow. Alternative: extracting the release tarball directly (same pattern as GitHub CLI) is fully reproducible but repeats what the script does.
- **npm tools in one `RUN`:** `npm install -g pnpm@<range from package.json> @anthropic-ai/claude-code@… @fission-ai/openspec@…`. pnpm has no `ARG`: the Dockerfile copies the root `package.json` and installs the range of `devEngines.packageManager` (a valid npm spec such as `^12.21.0`, so the latest matching 12.x at build time), keeping one source for the pnpm version that Renovate already updates; pnpm's own `onFail: download` then covers any remaining difference. Claude Code is kept on npm (pinned, reproducible, Renovate-visible) rather than the self-updating native installer.
- **Playwright:** `npx -y playwright install-deps chromium` stays, without a pinned version: the version only selects which OS package list is installed, which barely changes between releases, so an `ARG` that duplicates the version of `services/web` would only add Renovate pull requests. The build therefore uses the current release. Only OS libraries are installed (browsers stay on-demand, matching the version in the repository's lockfile).

## Risks / Trade-offs

- [Image cannot be built locally] → CI builds it in the pull request and the stack start check boots it; review the Dockerfile closely.
- [Release asset names change upstream] → the build fails loudly in the Renovate pull request, which is then not merged.
- [A package pulled in as a dependency asks a debconf question on the minimal Ubuntu base (for example `tzdata`)] → `ARG DEBIAN_FRONTEND=noninteractive`, build-time only.
- [The first start on the fresh volume has no SSH key, Claude login or checkout] → one-time bootstrap: the entrypoint clones the repository and, because the new key is not yet known to GitHub, exits and prints the public key to register; `claude /login` is run once (see Migration Plan).
- [Node download fails] → the build fails; there is no checksum check beyond HTTPS.
- [`.nvmrc` has a `v` prefix, the download URL needs it too] → use the file content verbatim (`v26.13.1`).
- [A future Playwright major changes `install-deps` or its package lists] → the CI image build fails and shows it.
- [More Renovate pull requests] → minor/patch automerge under the existing rule.

## Migration Plan

No data migration; the old volume is left behind on purpose. With the first deployment the dev machine starts on the empty `dev_machine_home` volume:

1. The entrypoint prints the new public key because GitHub does not know it yet; register it at https://github.com/settings/keys and recreate the container (`docker compose up -d --force-recreate dev-machine`) so that it clones the repository.
2. Run `docker compose exec -it dev-machine claude` and `/login` once so Remote Control can run.
3. Check SSH as `ubuntu` (new SSH host key, clients warn once), code-server and Remote Control.
4. Anything wanted from the old volume (for example uncommitted work) can be copied out of the volume `dev_home` first; remove it with `docker volume rm` when done (it is not deleted automatically).

Rollback: redeploy the previous image and compose file; the old `dev_home` volume is still there.
