# Proposal

## Why

Oxlint is currently configured by four near-identical `services/*/.oxlintrc.json` files that only enable the `correctness` and `suspicious` categories, so performance, restriction and style rules are unchecked and the files drift apart. Code formatting (indentation, quotes, whitespace, line wrapping) is enforced by nothing at all, only by habit and review.

## What Changes

- Replace the four per-package `.oxlintrc.json` files with **one** `.oxlintrc.json` in the repo root. Service-specific settings (React plugin, browser env, Storybook rules, ignore patterns, `react-refresh` options) move into `overrides` scoped by `services/<name>/**` globs.
- Point every package's `lint` and `lint:ci` script at that file (`-c ../../.oxlintrc.json`); script names, `--type-aware`, `--fix` and `--deny-warnings` stay as they are, so CI still lints per service.
- Widen the rule set: add the `perf` and `style` categories at error level, and cherry-pick a curated set of `restriction` rules (for example `no-console`, `no-alert`, `no-eval`, `typescript/no-explicit-any`, `import/no-cycle`) instead of enabling the whole noisy category. `pedantic` and `nursery` stay off. Rules from an enabled category that conflict with the project's conventions (for example default exports required by Next.js) are turned off with a short comment.
- Add formatting with **oxfmt** (the Prettier-compatible formatter of the Oxc project), configured by one root `.oxfmtrc.json`: 2-space indentation, single quotes, no semicolons, trailing commas, `printWidth` 120. Format with `format` scripts per package; `lint` formats and fixes locally, `lint:ci` runs `oxfmt --check` after oxlint and fails on unformatted files.
- Run oxfmt over the existing code once (code and CSS files only, not JSON, Markdown, YAML or lockfiles).
- Make the Oxc VS Code extension the default formatter with format-on-save in `.vscode/settings.json`; it is already listed in `.vscode/extensions.json` recommendations and stays there.
- Fix all new oxlint findings once (mostly via `--fix`), or disable an individual rule with a documented reason.
- Treat `.oxlintrc.json` as a shared workspace file in the pipeline's change detection, so changing it lints and tests every service.
- Update `CLAUDE.md` (conventions and commands) to describe the single config and the style checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pipeline`: the shared lint configuration counts as a shared workspace file for change detection; added requirements that all packages are linted with one shared configuration and that the lint task also checks formatting.

## Impact

- Removed: `services/{web,assistant,whatsapp,wichteln}/.oxlintrc.json`. Added: root `.oxlintrc.json`.
- `package.json` (root devDependencies: `oxfmt`, plus `eslint-plugin-react-refresh` and `eslint-plugin-storybook`, since JS plugins resolve relative to the config file), the four service `package.json` files (scripts, dependencies), `pnpm-lock.yaml`.
- Added root `.oxfmtrc.json`; `.vscode/settings.json` (default formatter, format on save).
- `.github/scripts/detect-changes.mjs` and its test.
- Source files across all services reformatted (wrapping at 120 columns touches roughly 4% of lines) or adjusted for new findings: a large but mechanical diff.
- `CLAUDE.md`, `openspec/specs/pipeline/spec.md` (via delta).
