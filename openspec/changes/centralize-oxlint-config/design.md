# Design

## Context

Each package runs `oxlint --type-aware` from its own folder and picks up the `.oxlintrc.json` next to it (four files, ~28–80 lines each, `correctness` + `suspicious` only). `oxlint` and `oxlint-tsgolint` are already root devDependencies. CI lints per service (`working-directory: services/<name>`, `pnpm run lint:ci`), gated by `detect-changes.mjs`. The existing code is consistently formatted: single quotes, 2-space indent, no semicolons, long lines (no wrapping). Oxlint has no built-in formatting rules; the formatter in the same ecosystem (oxfmt) is a separate tool.

## Goals / Non-Goals

**Goals:**
- One config file, one source of truth for rules, scoped overrides per service.
- Stricter rule coverage (perf, style, selected restriction) and style checks enforced by lint.

**Non-Goals:**
- Introducing a separate formatter (oxfmt/Prettier) or a format-on-save pipeline.
- Enforcing a maximum line length or import ordering (current code has neither; would cause a huge, low-value diff).
- Enabling `pedantic`, `nursery` or the whole `restriction` category.

## Decisions

**1. Config location: root `.oxlintrc.json` with `overrides`, packages pass `-c ../../.oxlintrc.json`.**
Oxlint resolves `overrides[].files` globs and `ignorePatterns` relative to the config file, so service scoping uses `services/web/**` etc. Scripts stay per package (`oxlint --type-aware -c ../../.oxlintrc.json`, still run from the package folder) so type-aware linting finds each package's `tsconfig.json` and the CI job layout and per-service change detection stay untouched. *Alternative:* a single `oxlint` run from the root — rejected, it would lint every service whenever one changes and break the per-service jobs. *Alternative:* `oxlint.config.ts` — rejected for now; JSON is what exists and is enough (JSONC comments allowed for rationale).

**2. Rule set.**
- Categories at `error`: `correctness`, `suspicious`, `perf`, `style`. Off: `pedantic`, `nursery`, `restriction` (as a category).
- Restriction, cherry-picked at `error`: `no-console` (a `logger` exists in each service), `no-alert`, `no-eval`, `no-new-func`, `no-var`, `typescript/no-explicit-any`, `import/no-cycle`, `import/no-duplicates`, `import/no-self-import`, `typescript/consistent-type-imports` if it does not conflict with Next/`isolatedModules` setup.
- Exceptions: after the first run, rules of the enabled categories that are noisy or conflict with the stack (e.g. `import/no-default-export`/`prefer-default-export` style rules vs. Next.js pages, `no-magic-numbers`, `id-length`, `sort-imports`, `max-lines*`) are set to `off` with a one-line comment each. The existing exceptions are kept (`react/purity`, `react/react-in-jsx-scope`, test overrides for `no-unsafe-type-assertion`/`consistent-return`). The exact exception list is decided against real findings during apply; the principle is "category on, justified exceptions off", not rule-by-rule opt-in.
- Test files (`**/*.tests.ts(x)`, stories) get a small override for rules that make no sense there (e.g. `no-console`, `no-magic-numbers`).

**3. Style via `@stylistic/eslint-plugin` as an oxlint `jsPlugin`.**
It provides indentation, quotes, spacing, `semi`, `eol-last`, etc., with autofix, and runs inside oxlint (JS plugins are already used here for `react-refresh`/`storybook`). Configured to the present style: `indent: 2`, `quotes: single` (`avoidEscape`), `jsx-quotes: prefer-double`, `semi: never`, `comma-dangle` and `object-curly-spacing`/`brace-style`/`arrow-parens` chosen as whichever option yields the fewest edits on the current code, plus `no-trailing-spaces`, `eol-last`, `no-multiple-empty-lines` (max 1), `space-infix-ops`, `keyword-spacing`, `comma-spacing`, `space-before-blocks`, `space-before-function-paren`, `arrow-spacing`, `key-spacing`, `jsx-indent`, `jsx-curly-spacing`. No `max-len`. *Alternative:* oxfmt (Prettier-compatible, much faster, but it is a formatter, not checked by `oxlint`, and needs its own script/CI step) — rejected because the request is to have the checks in oxlint; remains a drop-in later if JS-plugin speed hurts. *Alternative:* built-in oxlint `style` rules alone — they cover idiom (e.g. `prefer-const`-style), not whitespace/indent/quotes, so insufficient.

**4. JS plugin dependencies move to the root.** JS plugins are resolved relative to the config file, so `eslint-plugin-react-refresh`, `eslint-plugin-storybook` and `@stylistic/eslint-plugin` become root devDependencies and are removed from the service `package.json`s.

**5. `.oxlintrc.json` is a shared workspace file in `detect-changes.mjs`**, so editing the rules lints and tests all services (same treatment as `pnpm-lock.yaml`). Dockerfiles are unaffected: lint does not run in image builds.

## Risks / Trade-offs

- [JS-plugin rules are slower than native rules, and the plugin API is still alpha] → measure lint time before/after during apply; if CI lint time grows unacceptably, scope the `@stylistic` rules to the fewest necessary or switch to oxfmt.
- [Type-aware run with `-c` from a sub-folder or globs relative to the root config may not match as expected] → verify per service that overrides apply (e.g. React rules only fire in web/wichteln) and that `tsconfig.json` is found.
- [Very large one-off diff from `--fix` plus manual fixes, hard to review] → apply style autofix first, review the rule changes and the formatting diff as separate chunks of the one diff; no behavior changes beyond mechanical fixes.
- [Some new `perf`/`style` findings need judgement, not autofix] → fix when trivial, otherwise `oxlint-disable-next-line` with a reason; never blanket-disable a category.
- [Stylistic rules may disagree with each other or with auto-fixers of the correctness rules, causing a fix loop] → run `lint` twice and require a clean second pass and a clean `lint:ci`.

## Migration Plan

Single change, single commit: add root config, switch scripts, fix findings, delete the four old configs. Rollback is a revert of that commit. No data, runtime or image impact.
