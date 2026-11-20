# Design

## Context

- `web`, `assistant`, `whatsapp` use `typescript: npm:@typescript/typescript6@^6.0.2`; `wichteln` uses `5.9.3`. Latest is `7.0.2`.
- Each package has its own flat `eslint.config.mjs` with: `eslint:recommended`, typescript-eslint `recommendedTypeChecked` + `strictTypeChecked` + `stylisticTypeChecked`, `@stylistic` recommended (+ `max-statements-per-line: 2`), `no-extraneous-class` off. Web and wichteln add react-hooks and react-refresh; web adds storybook.
- ~26 `eslint-disable` comments exist in source.
- `typescript-eslint` requires `typescript <6.1.0`, so it blocks TS 7.

## Decisions

1. **Oxlint with type-aware linting (`oxlint-tsgolint`)**, one `.oxlintrc.json` per package, mirroring today's per-package layout. Categories: `correctness` + `suspicious` + `pedantic`-level strict rules mapped to the current typescript-eslint strict/stylistic sets where an equivalent exists; plugins `typescript`, `react`, `react-hooks`(where applicable), `unicorn`/`import` not enabled. Rules without an Oxlint equivalent are dropped, not re-implemented.
2. **react-refresh and storybook rules** are kept via Oxlint `jsPlugins` if they load and work in the type-checked run; otherwise they are dropped and noted in the apply diff.
3. **Stylistic rules are dropped** (assumption, no formatter added). Introducing oxfmt/Prettier would reformat the repo and is a separate change. If the user wants style enforced, that is a follow-up.
4. **One TypeScript version** declared identically in all four packages (`typescript@^7`), no alias. Order: upgrade TS first and fix compile errors (`tsc`/`next build`), then swap the linter, so failures are attributable.
5. **Scripts** keep their names: `lint` = `oxlint --type-aware --fix`, `lint:ci` = `oxlint --type-aware` (fail on warnings with `--deny-warnings`). Root scripts, pipeline and `service.yml` stay unchanged.
6. **Disable comments** are converted to `oxlint-disable[-next-line|-line]`; Oxlint also honors `eslint-disable`, but we convert so no ESLint naming remains. Comments for rules Oxlint lacks are removed.

7. **Node 26 images, no corepack.** All Dockerfiles move to `26.13.1` (alpine3.24, slim, bookworm-slim variants) and `.nvmrc` (used by the CI setup action) to `v26.13.1`. Node 25+ dropped bundled corepack, which broke Dependabot PR #428 (`/bin/sh: corepack: not found`). Corepack was only used to get pnpm, so it is dropped: each `base` stage (web, assistant, whatsapp, wichteln) and the dev-machine run `npm install -g pnpm@12`, and the `corepack enable pnpm &&` prefixes are removed.
8. **pnpm 12 pinned via `devEngines.packageManager`.** The root `package.json` drops `packageManager` and declares `devEngines.packageManager` = `{ name: pnpm, version: ^12.21.0, onFail: download }`. A range is allowed there, the resolved version lands in `pnpm-lock.yaml` (`packageManagerDependencies`), and a globally installed pnpm 12 satisfies it without switching. Verified locally with pnpm 12.21.0: frozen install, lint, build and all tests pass. An older pnpm (e.g. the 11.7.0 previously installed on the dev machine) tries to download pnpm 12 and fails in a container without `libatomic`, so the dev-machine image installs pnpm 12 directly.

## Risks / Trade-offs

- Next.js, Storybook, Vitest, `@types/*` or other tooling may not yet support TS 7 (e.g. API-dependent tools). Mitigation: verify `build`, `test`, Storybook; if one blocks, report it as a blocker rather than pinning silently.
- Oxlint's type-aware rule coverage is smaller than typescript-eslint's; some checks (e.g. `no-unsafe-*`) may be weaker or absent. Accepted trade-off.
- Docker image builds could not be run locally (no Docker in the dev container); they are verified by the pipeline on the PR.
- Loss of style enforcement (see decision 3).
