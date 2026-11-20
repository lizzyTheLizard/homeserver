# Proposal

## Why

Each of the four packages carries a 165–215 line `.oxlintrc.json` that enables roughly 50 individual `typescript/*` rules (a hand-copied port of the old typescript-eslint strict/stylistic sets) and then repeats the same ~60 rules as `"off"` in a `.js/.cjs/.mjs` override. The files are noisy, drift between packages and are hard to review. Oxlint ships rule categories meant for exactly this; we should lean on them and keep only the settings that are genuinely project-specific.

## What Changes

- Replace the per-rule lists in `services/{web,assistant,whatsapp,wichteln}/.oxlintrc.json` with a standard setup: relevant plugins plus the `correctness` and `suspicious` categories at error level (all other categories off), and no individually listed built-in rules except deliberate, commented exceptions.
- Remove the large `"off"` override block for JS/CJS/MJS files; keep a minimal override only if type-aware rules still fail on those files.
- Keep the project-specific parts: `env`, `ignorePatterns`, the `react-refresh` and `storybook` js plugins with their options and story/`.storybook` overrides, and the existing exceptions that are still needed (`react/purity`, `no-extraneous-class`).
- Fix or explicitly disable (with a reason) any new findings the standard set produces.
- Keep script names and flags (`lint`, `lint:ci`, `--type-aware`, `--deny-warnings`) unchanged. No dependency changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Linting still fixes locally and only reports in CI; only the rule configuration changes, so no requirement changes (`skip_specs: true`).

## Impact

- `services/*/.oxlintrc.json` (four files, ~730 lines shrinking to a few dozen each).
- Possibly a handful of source edits or `oxlint-disable` comments for newly reported findings.
- `CLAUDE.md` unchanged. CI lint jobs run against the new config.
