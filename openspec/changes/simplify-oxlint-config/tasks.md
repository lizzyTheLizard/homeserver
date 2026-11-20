# Tasks

## 1. Establish the baseline

- [x] 1.1 Install dependencies in the worktree (`pnpm install`) and record the current `pnpm lint:ci` result (passes) and rule count per config, so the change can be compared against it.

## 2. Simplify the configs

- [x] 2.1 Rewrite `services/assistant/.oxlintrc.json` and `services/whatsapp/.oxlintrc.json` to plugins `typescript`, categories `correctness` + `suspicious` + `style` as error and `perf` as warn, `env`, `ignorePatterns`; verify `pnpm --filter @homeserver/assistant lint:ci` and `pnpm --filter @homeserver/whatsapp lint:ci` run.
- [x] 2.2 Rewrite `services/web/.oxlintrc.json` and `services/wichteln/.oxlintrc.json` the same way, keeping `react` plugin, `react-refresh`/storybook js plugins and their overrides, react-hooks rules and `react/purity: off`; verify both `lint:ci` commands run.
- [x] 2.3 Remove the JS/CJS/MJS `"off"` override blocks; add back only a minimal override if type-aware findings appear in those files. Verify no config lists more than a handful of built-in rules and each remaining exception has a reason.
- [x] 2.4 Check that type-aware rules from the enabled categories actually run (e.g. introduce and revert a floating promise in a scratch file) and re-list individually any essential type-aware rule that does not.

## 3. Resolve findings

- [x] 3.1 Apply oxlint's safe autofixes and repeat until stable; verify type checks pass. Findings without an autofix are left open for manual fixing by the user (decided after the count was reported); add a targeted `oxlint-disable-next-line` only where an autofix would break code.
- [x] 3.2 Verify the unit/integration tests pass for all four packages after the autofixes. `lint:ci` is expected to stay red until the remaining findings are fixed manually.
