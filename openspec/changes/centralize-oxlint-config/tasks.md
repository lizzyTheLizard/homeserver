# Tasks

## 1. Shared configuration

- [ ] 1.1 Move `eslint-plugin-react-refresh` and `eslint-plugin-storybook` to the root devDependencies, add `@stylistic/eslint-plugin`, remove them from the service `package.json`s and run `pnpm install`. Verify: lockfile updated, `pnpm install --frozen-lockfile` succeeds.
- [ ] 1.2 Create the root `.oxlintrc.json`: plugins, `correctness`/`suspicious`/`perf`/`style` at error, curated `restriction` rules, per-service `overrides` (react/browser env and `react-refresh` options for web and wichteln, Storybook rules for web, `node` env for assistant and whatsapp, test-file exceptions), root-relative `ignorePatterns`. Verify: `pnpm exec oxlint --print-config -c .oxlintrc.json` (or a first run) parses without errors.
- [ ] 1.3 Add the `@stylistic` rules (indent 2, single quotes, no semicolons, whitespace rules from the design); pick the `comma-dangle`/`brace-style`/`arrow-parens` options that need the fewest edits. Verify: a trial run on one service reports only a small set of formatting findings.
- [ ] 1.4 Switch `lint` and `lint:ci` in `services/{web,assistant,whatsapp,wichteln}/package.json` to use `-c ../../.oxlintrc.json` and delete the four `services/*/.oxlintrc.json`. Verify: `find . -name '.oxlintrc*' -not -path '*/node_modules/*'` lists only the root file; each package's `lint:ci` runs the type-aware lint with the shared config.

## 2. Resolve findings

- [ ] 2.1 Run `pnpm lint` to autofix formatting and fixable rules in all packages; review that the diff is formatting only. Verify: running `pnpm lint` a second time changes nothing.
- [ ] 2.2 Fix the remaining `perf`/`style`/`restriction` findings by hand, or turn a rule off with a one-line reason in the config (or an `oxlint-disable-next-line` with reason for a single site). Verify: `pnpm lint:ci` passes in all four packages with `--deny-warnings`.
- [ ] 2.3 Verify scoping and speed: React/Storybook rules fire only in web/wichteln (inject a temporary violation and remove it), and compare lint time per package with the previous setup. Verify: results noted in the review summary.

## 3. Pipeline and docs

- [ ] 3.1 Add `.oxlintrc.json` to `SHARED_WORKSPACE_FILES` in `.github/scripts/detect-changes.mjs` and to the shared-files case in `detect-changes.test.mjs`. Verify: the detect-changes test file passes (`node --test .github/scripts/`).
- [ ] 3.2 Update `CLAUDE.md`: the lint command comment and the "Linting is Oxlint…" convention (single root config, style checks via the stylistic plugin, no per-package config). Verify: no remaining mention of a per-package config or of "no stylistic/formatting rules".

## 4. Final verification

- [ ] 4.1 Run `pnpm lint:ci`, `pnpm test` and `pnpm build`. Verify: all succeed, then show the full diff for review.
