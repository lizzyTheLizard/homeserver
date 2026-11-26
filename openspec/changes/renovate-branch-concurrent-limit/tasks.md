# Tasks

## 1. Renovate configuration

- [x] 1.1 Add `branchConcurrentLimit: 20` with an explanatory comment next to `prConcurrentLimit` in `.github/renovate.json5`; verify with `pnpm lint:ci` and `npx --yes --package renovate renovate-config-validator .github/renovate.json5`

## Workflow follow-up

- After merge, run the Renovate workflow by hand and check on issue #445 that the Rate-Limited section empties.
