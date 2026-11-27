# Tasks

## 1. Renovate configuration

- [x] 1.1 In `.github/renovate.json5` set `internalChecksFilter: 'strict'` with a comment that the branch only appears once the release is old enough (so pnpm's install cannot fail) and that the pull request is therefore opened at once; remove `prCreation`, `platformAutomerge` and `prHourlyLimit`, which only restate or tighten defaults
- [x] 1.2 In `.github/renovate.json5` add a package rule for `matchUpdateTypes: ['major']` with `commitMessagePrefix` and `prHeader` stating a major update and the need for a manual merge, placed before the `postgres` rule
- [x] 1.3 Remove `branchConcurrentLimit` and its comment from `.github/renovate.json5`

## 2. Verify

- [x] 2.1 Run `pnpm lint` and check that `.github/renovate.json5` is valid (`npx --yes --package renovate renovate-config-validator .github/renovate.json5`)
- [ ] 2.2 After the merge, dispatch the Renovate workflow once and confirm in the dependency dashboard and the pull request list that the waiting updates get pull requests
