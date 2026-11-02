# Tasks

## 1. Deploy condition

- [ ] 1.1 In `.github/workflows/service.yml`, change the `deploy` job condition from `if: inputs.deploy` to `if: ${{ !cancelled() && inputs.deploy && needs.build.result == 'success' }}`, with a one-line comment explaining that skipped lint/test must not block the deploy. Verify the workflow still parses by checking that the PR's pipeline run starts and reaches the Quality Gate.
- [ ] 1.2 Check the condition against the cases in the spec delta by reading the job graph:
  - On a PR, `deploy` is false.
  - A failed lint or test means the build is not `success`, so there is no deploy.
  - A skipped lint and test with a successful build deploys.
  Verify with `grep -n -A4 "^  deploy:" .github/workflows/service.yml`.

## Workflow follow-up

- After merge, the main run deploys the whole stack (pipeline definition changed), which recreates the development machine.
- The next change touching only `services/dev-machine/` should show `Dev Machine / Deploy` as succeeded instead of skipped.
