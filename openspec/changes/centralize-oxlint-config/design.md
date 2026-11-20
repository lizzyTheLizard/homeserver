# Design

## Context

Each package runs `oxlint --type-aware` from its own folder and picks up the `.oxlintrc.json` next to it (four files, ~28–80 lines each, `correctness` + `suspicious` only). `oxlint` and `oxlint-tsgolint` are already root devDependencies. CI lints per service (`working-directory: services/<name>`, `pnpm run lint:ci`), gated by `detect-changes.mjs`. The existing code is consistently formatted: single quotes, 2-space indent, no semicolons, long lines (no wrapping). Oxlint has no built-in formatting rules; the formatter of the same ecosystem is oxfmt, a separate tool. About 4% of existing lines exceed 120 columns and 6% exceed 100; the code uses trailing commas in multi-line literals. `.vscode/extensions.json` already recommends `oxc.oxc-vscode`; `settings.json` only has fix-on-save and `oxc.typeAware`.

## Goals / Non-Goals

**Goals:**
- One config file, one source of truth for rules, scoped overrides per service.
- Stricter rule coverage (perf, style, selected restriction) and formatting enforced by the lint task, locally and in CI.

**Non-Goals:**
- Prettier or any other formatter; formatting JSON, Markdown, YAML, SQL or lockfiles.
- Import ordering or other oxfmt opt-in features.
- Enabling `pedantic`, `nursery` or the whole `restriction` category.

## Decisions

**1. Config location: root `.oxlintrc.json` with `overrides`, packages pass `-c ../../.oxlintrc.json`.**
Oxlint resolves `overrides[].files` globs and `ignorePatterns` relative to the config file, so service scoping uses `services/web/**` etc. Scripts stay per package (`oxlint --type-aware -c ../../.oxlintrc.json`, still run from the package folder) so type-aware linting finds each package's `tsconfig.json` and the CI job layout and per-service change detection stay untouched. *Alternative:* a single `oxlint` run from the root — rejected, it would lint every service whenever one changes and break the per-service jobs. *Alternative:* `oxlint.config.ts` — rejected for now; JSON is what exists and is enough (JSONC comments allowed for rationale).

**2. Rule set.**
- Categories at `error`: `correctness`, `suspicious`, `perf`, `style`. Off: `pedantic`, `nursery`, `restriction` (as a category).
- Restriction, cherry-picked at `error`: `no-console` (a `logger` exists in each service), `no-alert`, `no-eval`, `no-new-func`, `no-var`, `typescript/no-explicit-any`, `import/no-cycle`, `import/no-duplicates`, `import/no-self-import`, `typescript/consistent-type-imports` if it does not conflict with Next/`isolatedModules` setup.
- Exceptions: after the first run, rules of the enabled categories that are noisy or conflict with the stack (e.g. `import/no-default-export`/`prefer-default-export` style rules vs. Next.js pages, `no-magic-numbers`, `id-length`, `sort-imports`, `max-lines*`) are set to `off` with a one-line comment each. The existing exceptions are kept (`react/purity`, `react/react-in-jsx-scope`, test overrides for `no-unsafe-type-assertion`/`consistent-return`). The exact exception list is decided against real findings during apply; the principle is "category on, justified exceptions off", not rule-by-rule opt-in.
- Test files (`**/*.tests.ts(x)`, stories) get a small override for rules that make no sense there (e.g. `no-console`, `no-magic-numbers`).

**3. Formatting via oxfmt with a root `.oxfmtrc.json`.**
Oxfmt is Prettier-compatible, fast and from the same project as oxlint, and the Oxc VS Code extension can use it. Options matching the existing code: `tabWidth: 2`, `singleQuote: true`, `jsxSingleQuote: false`, `semi: false`, `trailingComma: "all"`, `printWidth: 120`. 120 is a compromise: 100 would rewrap ~6% of lines, 120 ~4%, and the longest function signatures stay readable; the exact value can be adjusted in apply if the diff looks wrong. It formats `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs` and `*.css` under `services/`; build output, `.next`, `storybook-static`, `dist`, `public` and generated files are ignored. *Alternative:* `@stylistic/eslint-plugin` as an oxlint JS plugin — rejected (the user prefers a real formatter): alpha JS-plugin API, slower, and it cannot wrap lines. *Alternative:* Prettier — rejected, slower and a heavier dependency for the same output.

**3a. Scripts and CI.** Per package: `format` = `oxfmt -c ../../.oxfmtrc.json`, `format:check` = same with `--check`. `lint` runs `oxfmt` first and then `oxlint --fix` (so lint fixes never leave unformatted code), `lint:ci` runs `oxlint … --deny-warnings && oxfmt --check`. The check therefore runs inside the existing per-service lint job and needs no change to `service.yml`, which would otherwise mark the whole pipeline as changed.

**3b. VS Code.** `.vscode/settings.json` sets `editor.defaultFormatter: "oxc.oxc-vscode"` and `editor.formatOnSave: true` for the formatted languages. The extension is already in `.vscode/extensions.json` recommendations; nothing to add there.

**4. JS plugin dependencies move to the root.** JS plugins are resolved relative to the config file, so `eslint-plugin-react-refresh` and `eslint-plugin-storybook` become root devDependencies (together with `oxfmt`) and are removed from the service `package.json`s.

**5. `.oxlintrc.json` is a shared workspace file in `detect-changes.mjs`**, so editing the rules lints and tests all services (same treatment as `pnpm-lock.yaml`). Dockerfiles are unaffected: lint does not run in image builds.

## Risks / Trade-offs

- [Oxfmt is still young (beta); output may differ from Prettier or change between versions] → pin the version via the lockfile; Renovate bumps arrive as reviewable PRs where `format:check` shows any churn.
- [Type-aware run with `-c` from a sub-folder or globs relative to the root config may not match as expected] → verify per service that overrides apply (e.g. React rules only fire in web/wichteln) and that `tsconfig.json` is found.
- [Very large one-off diff from formatting plus manual fixes, hard to review] → commit nothing before review; formatting is mechanical, review the config and rule changes first, then skim the formatting diff (`git diff -w` helps).
- [Some new `perf`/`style` findings need judgement, not autofix] → fix when trivial, otherwise `oxlint-disable-next-line` with a reason; never blanket-disable a category.
- [oxlint fixes and oxfmt could fight over the same code] → `lint` runs oxfmt before oxlint `--fix`; require a clean second run and a clean `lint:ci`.

## Migration Plan

Single change, single commit: add root config, switch scripts, fix findings, delete the four old configs. Rollback is a revert of that commit. No data, runtime or image impact.
