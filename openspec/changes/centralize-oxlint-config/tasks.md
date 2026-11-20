# Tasks

## 1. Shared configuration

- [ ] 1.1 Move `eslint-plugin-react-refresh` and `eslint-plugin-storybook` to the root devDependencies, add `oxfmt`, remove them from the service `package.json`s and run `pnpm install`. Verify: lockfile updated, `pnpm install --frozen-lockfile` succeeds.
- [ ] 1.2 Create the root `.oxlintrc.json`: plugins, `correctness`/`suspicious`/`perf`/`style` at error, curated `restriction` rules, per-service `overrides` (react/browser env and `react-refresh` options for web and wichteln, Storybook rules for web, `node` env for assistant and whatsapp, test-file exceptions), root-relative `ignorePatterns`. Verify: `pnpm exec oxlint --print-config -c .oxlintrc.json` (or a first run) parses without errors.
- [ ] 1.3 Create the root `.oxfmtrc.json` (`tabWidth` 2, `singleQuote`, no `semi`, `trailingComma` all, `printWidth` 120, ignore patterns for build output and generated files, only code and CSS files). Verify: `pnpm exec oxfmt --check -c .oxfmtrc.json services/web/app/shared/auth/auth.ts` runs; a trial run reports the expected share of changed files, otherwise adjust `printWidth`.
- [ ] 1.4 In `services/{web,assistant,whatsapp,wichteln}/package.json` point oxlint at `-c ../../.oxlintrc.json`, add `format` and `format:check` (oxfmt with `-c ../../.oxfmtrc.json`), make `lint` run oxfmt before `oxlint --fix` and `lint:ci` run oxlint then `oxfmt --check`, and delete the four `services/*/.oxlintrc.json`. Verify: `find . -name '.oxlintrc*' -not -path '*/node_modules/*'` lists only the root file; each package's `lint:ci` runs the type-aware lint and the format check with the shared configs.

## 2. Resolve findings

- [ ] 2.1 Run `pnpm lint` to format and autofix fixable rules in all packages; review that the diff is formatting only (`git diff -w` ignoring wrapping). Verify: running `pnpm lint` a second time changes nothing.
- [ ] 2.2 Fix the remaining `perf`/`style`/`restriction` findings by hand, or turn a rule off with a one-line reason in the config (or an `oxlint-disable-next-line` with reason for a single site). Verify: `pnpm lint:ci` passes in all four packages with `--deny-warnings`.
- [ ] 2.3 Verify scoping and speed: React/Storybook rules fire only in web/wichteln (inject a temporary violation and remove it), and compare lint time per package with the previous setup. Verify: results noted in the review summary.

## 3. Pipeline, editor and docs

- [ ] 3.1 Add `.oxlintrc.json` to `SHARED_WORKSPACE_FILES` in `.github/scripts/detect-changes.mjs` and to the shared-files case in `detect-changes.test.mjs`. Verify: the detect-changes test file passes (`node --test .github/scripts/`).
- [ ] 3.2 Update `.vscode/settings.json` with `editor.defaultFormatter` `oxc.oxc-vscode` and `editor.formatOnSave` (per formatted language); `oxc.oxc-vscode` stays in `.vscode/extensions.json`. Verify: both files are valid JSON and `oxc.oxc-vscode` is still listed.
- [ ] 3.3 Update `CLAUDE.md`: the lint command comment (formatting included) and the "Linting is Oxlint…" convention (single root `.oxlintrc.json` and `.oxfmtrc.json`, formatting by oxfmt, no per-package config, no semicolons/single quotes). Verify: no remaining mention of a per-package config or of "no stylistic/formatting rules".

## 4. Final verification

- [ ] 4.1 Run `pnpm lint:ci`, `pnpm test` and `pnpm build`. Verify: all succeed, then show the full diff for review.
