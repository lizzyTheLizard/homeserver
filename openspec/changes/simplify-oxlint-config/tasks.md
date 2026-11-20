# Tasks

## 1. Establish the baseline

- [ ] 1.1 Install dependencies in the worktree (`pnpm install`) and record the current `pnpm lint:ci` result (passes) and rule count per config, so the change can be compared against it.

## 2. Simplify the configs

- [ ] 2.1 Rewrite `services/assistant/.oxlintrc.json` and `services/whatsapp/.oxlintrc.json` to plugins `typescript`, categories `correctness` + `suspicious` as error, `env`, `ignorePatterns`; verify `pnpm --filter @homeserver/assistant lint:ci` and `pnpm --filter @homeserver/whatsapp lint:ci` run.
- [ ] 2.2 Rewrite `services/web/.oxlintrc.json` and `services/wichteln/.oxlintrc.json` the same way, keeping `react` plugin, `react-refresh`/storybook js plugins and their overrides, react-hooks rules and `react/purity: off`; verify both `lint:ci` commands run.
- [ ] 2.3 Remove the JS/CJS/MJS `"off"` override blocks; add back only a minimal override if type-aware findings appear in those files. Verify no config lists more than a handful of built-in rules and each remaining exception has a reason.
- [ ] 2.4 Check that type-aware rules from the enabled categories actually run (e.g. introduce and revert a floating promise in a scratch file) and re-list individually any essential type-aware rule that does not.

## 3. Resolve findings

- [ ] 3.1 Fix real findings and add targeted `oxlint-disable-next-line` comments (with reason) for the rest; if findings are numerous, stop and report the count before disabling broadly.
- [ ] 3.2 Verify `pnpm lint:ci` and `pnpm test` pass for all four packages, and show the full diff for review.
