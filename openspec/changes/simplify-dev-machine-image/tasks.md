# Tasks

## 1. Renovate

- [ ] 1.1 Add `customManagers:dockerfileVersions` to `extends` in `renovate.json5`; verify with `npx --yes --package renovate renovate-config-validator renovate.json5` (or the repo's equivalent) that the config is valid.

## 2. Dockerfile

- [ ] 2.1 Rewrite `services/dev-machine/Dockerfile`: base `buildpack-deps:noble`, Node installed from the tarball of the `.nvmrc` version (`COPY .nvmrc`, `TARGETARCH` mapping, `SHASUMS256.txt` check), reduced apt list, annotated `ARG`s (pnpm, claude-code, openspec, playwright, gh, code-server), gh from tarball, code-server from `.deb`, single `npm install -g`, Playwright `install-deps` with the pinned ARG, `AGENTS.md` comment fixed to `CLAUDE.md`. Verify by reading the file: Node version is not hard-coded anywhere in it, no `latest`, every tool pinned with a `# renovate:` comment, no `curl | sh`, and `hadolint`/`docker build --check` if available.
- [ ] 2.2 Verify the annotations are recognized: run Renovate locally in dry-run (`renovate --platform=local`) if available, otherwise check each annotation against the preset's regex (`# renovate: datasource=… depName=…` followed by `ARG NAME_VERSION=…`).

## 3. Checks

- [ ] 3.1 Confirm `node --version` in the image would equal `.nvmrc` (CI stack start) and that `.nvmrc` still maps to the dev-machine in `detect-changes.test.mjs` (`pnpm --filter` not needed: `node --test .github/scripts/`).
- [ ] 3.2 Run `pnpm lint:ci` and confirm `openspec validate simplify-dev-machine-image` passes; the CI "build the dev machine image" step is the build check.
