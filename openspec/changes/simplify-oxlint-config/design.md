# Design

## Context

See proposal.md for motivation. Current state: every package has its own `.oxlintrc.json` with `categories.correctness = error`, ~50 explicit `typescript/*` rules (type-aware safety rules such as `no-floating-promises`, `no-unsafe-*`, plus stylistic ones such as `prefer-nullish-coalescing`), and a JS-file override that turns all of them off again. Web and Wichteln add `react`/`react-hooks`, the `react-refresh` js plugin and (web) `storybook` rules. Lint runs as `oxlint --type-aware` with `--deny-warnings` in CI.

## Goals / Non-Goals

**Goals:**
- Config readable at a glance; rule selection expressed through categories, not rule lists.
- Same shape in all four packages.

**Non-Goals:**
- Adding a formatter, changing the linter, or changing versions.
- Preserving every currently enabled rule; dropping the ones the standard set does not cover is accepted.

## Decisions

1. **Categories over rules.** Use `correctness` and `suspicious` at `error` (with `--deny-warnings` already in CI, `warn` would be equivalent but less honest). Not enabled: `pedantic`, `style`, `restriction`, `nursery`, which are opinionated or noisy. Alternative: keep `correctness` only — rejected because it drops common best-practice checks.
2. **Type-aware rules come via categories.** With `--type-aware`, type-aware rules that belong to the enabled categories (e.g. `no-floating-promises`, `no-misused-promises`) run without being listed. Any type-aware rule we still consider essential and that is not covered is listed individually with a one-line reason; the apply step checks this against the actual rule/category mapping of the installed oxlint.
3. **One small override at most for JS files.** Drop the 60-line `"off"` block. If `oxlint --type-aware` reports type-aware findings in `.js/.cjs/.mjs`, add a single override disabling the specific failing rules, or ignore those files, instead of mirroring the whole list.
4. **Keep project-specific config.** `env`, `ignorePatterns`, `react-refresh/only-export-components` with `allowExportNames`, react-hooks rules, storybook overrides and `react/purity: off` stay, since they encode framework conventions (Next.js route exports, Storybook files) rather than style preferences. `typescript/no-extraneous-class: off` stays only if it still reports.
5. **Per-package files, no shared base.** Packages stay self-contained (their own Docker build contexts and tooling); with the files shrinking to a few dozen lines, duplication is acceptable. Alternative: a root base config via `extends` — rejected for coupling.
6. **New findings:** fix real issues; where a rule is wrong for the codebase, use a targeted `oxlint-disable-next-line` with a reason, or turn the rule off in the config with a comment, rather than widening the config again.

## Risks / Trade-offs

- [Weaker checks: stylistic and strict rules disappear] → Accepted per goal; essential ones can be re-listed under decision 2.
- [Standard set reports many new findings] → Apply measures the count first; if it is large, report to the user before disabling anything broadly.
- [Category membership differs by oxlint version] → Verified against the installed version during apply; a later oxlint upgrade may shift findings, caught by `lint:ci`.
