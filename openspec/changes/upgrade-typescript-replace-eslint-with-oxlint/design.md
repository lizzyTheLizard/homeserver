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

## Risks / Trade-offs

- Next.js, Storybook, Vitest, `@types/*` or other tooling may not yet support TS 7 (e.g. API-dependent tools). Mitigation: verify `build`, `test`, Storybook; if one blocks, report it as a blocker rather than pinning silently.
- Oxlint's type-aware rule coverage is smaller than typescript-eslint's; some checks (e.g. `no-unsafe-*`) may be weaker or absent. Accepted trade-off.
- Loss of style enforcement (see decision 3).
