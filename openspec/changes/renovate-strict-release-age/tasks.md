# Tasks

## 1. Renovate configuration

- [ ] 1.1 In `renovate.json5` set `internalChecksFilter: 'strict'` and `prCreation: 'immediate'`, and rewrite the comment on `prCreation` to explain that the branch itself only appears once the release is old enough, so pnpm's install cannot fail
- [ ] 1.2 Remove `branchConcurrentLimit` and its comment from `renovate.json5`

## 2. Verify

- [ ] 2.1 Run `pnpm lint` and check that `renovate.json5` is valid (`npx --yes --package renovate renovate-config-validator renovate.json5`)
- [ ] 2.2 After the merge, dispatch the Renovate workflow once and confirm in the dependency dashboard and the pull request list that the waiting updates get pull requests
