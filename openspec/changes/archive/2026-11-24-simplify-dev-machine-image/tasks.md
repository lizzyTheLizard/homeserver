# Tasks

## 1. Renovate

- [x] 1.1 Add `customManagers:dockerfileVersions` to `extends` in `.github/renovate.json5`; verify with `npx --yes --package renovate renovate-config-validator .github/renovate.json5` (or the repo's equivalent) that the config is valid.

## 2. Dockerfile

- [x] 2.1 Rewrite `services/dev-machine/Dockerfile`: base `ubuntu:noble-<date>`, Node installed from the tarball of the `.nvmrc` version (copied `.nvmrc`, streamed into `tar`), apt packages (only what the machine needs, no rsync, net-tools, zip, unzip) and `LANG=C.UTF-8`, annotated `ARG`s (gh, code-server, claude-code, openspec), gh from tarball, code-server via its install script (standalone method, pinned `--version`), single `npm install -g` (pnpm range read from `package.json`), Playwright `install-deps` without a pinned version, `AGENTS.md` comment fixed to `CLAUDE.md`. Verify by reading the file: Node version is not hard-coded anywhere in it, no `latest` (except Playwright's `install-deps`), every other tool pinned with a `# renovate:` comment, no unpinned versions, and `hadolint`/`docker build --check` if available.
- [x] 2.2 Verify the annotations are recognized: run Renovate locally in dry-run (`renovate --platform=local`) if available, otherwise check each annotation against the preset's regex (`# renovate: datasource=… depName=…` followed by `ARG NAME_VERSION=…`).

## 3. Default user `ubuntu`

- [x] 3.1 Replace the `dev` user by the base image's `ubuntu` user in `services/dev-machine/` (`Dockerfile` sudoers line and `USER`, `supervisord.conf`, `entrypoint.sh`, `sshd_config`) and in `infrastructure/docker-compose.yml` (new volume `dev_machine_home` mounted at `/home/ubuntu` instead of `dev_home` at `/home/dev`); verify with `grep -rn "/home/dev\|user=dev\|AllowUsers dev"` finding nothing outside the OpenSpec archive.
- [x] 3.2 Update `README.md`, `CLAUDE.md` and `infrastructure/README.md` (SSH user, home path); verify with the same grep.
- [x] 3.3 Add the delta of the SSH requirement to `specs/dev-machine/spec.md` and verify with `openspec validate simplify-dev-machine-image --strict`.
- [x] 3.4 Update the volume table and the dev-machine sections of `infrastructure/README.md` (`dev_machine_home`, `ubuntu`, `/home/ubuntu`); verify with `grep -rn dev_home` finding nothing outside the OpenSpec change.

## 4. Checks

- [x] 4.1 Confirm `node --version` in the image would equal `.nvmrc` (CI stack start) and that `.nvmrc` still maps to the dev-machine in `detect-changes.test.mjs` (`pnpm --filter` not needed: `node --test .github/scripts/`).
- [x] 4.2 Run `pnpm lint:ci` and confirm `openspec validate simplify-dev-machine-image` passes; the CI "build the dev machine image" step is the build check.

## Workflow follow-up

- After the first deployment: register the new public key printed by the dev machine with GitHub, recreate the container, run `claude /login`, verify SSH as `ubuntu`, code-server and Remote Control, and remove the unused `dev_home` volume with `docker volume rm`. (needs the deployed image, so it happens after merge)
