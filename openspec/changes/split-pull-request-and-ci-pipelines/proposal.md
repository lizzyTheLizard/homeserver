# Proposal

## Why

One workflow serves both pull requests and merges to main, so every job carries `if` conditions for the event, main re-runs lint and tests that the pull request already passed, and the pull request builds each image twice (once to check it, once for the stack start, which in the end tests the registry's `latest` and not the pull request's image). Two purpose-built pipelines are simpler, faster on main and test what is actually going to be deployed.

## What Changes

- Replace `.github/workflows/pipeline.yml` and `.github/workflows/service.yml` with two workflows:
  - **Pull request** (pull requests only): lints the whole repository from the root; in parallel detects changes and runs the change guard; tests only the changed services (web, Wichteln); starts the stack, building the images of changed services and using the registry's `latest` for the rest; ends in "Quality Gate".
  - **CI** (push to main and manual dispatch): builds and publishes the images of all three services (web, Wichteln, dev machine), changed or not, then deploys the whole stack. No lint, no tests, no stack start, no quality gate.
- The pull request pipeline no longer has a separate build/publish job: the "Start stack" job builds the changed images itself and the stack runs with them.
- "Start stack" runs on every pull request, no longer only when the infrastructure changed.
- The per-service deploy is removed; the CI pipeline always deploys the whole stack once, after all images are published.
- Change detection serves only pull requests: the push/dispatch handling and the separate "infrastructure changed" result are dropped, and the pipeline file list follows the new workflow names.
- **BREAKING** for repository settings only: "Quality Gate" is now reported by the "Pull request" workflow only; the required check keeps its name, so branch protection and Renovate auto-merge need no change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pipeline`: the single build-and-deploy pipeline requirement becomes two pipelines (pull request and CI); lint becomes one repository-wide job; tests, stack start and quality gate belong to the pull request pipeline; image publish and the whole-stack deploy belong to the CI pipeline and cover every service.

## Impact

- `.github/workflows/pipeline.yml`, `.github/workflows/service.yml` removed; new `.github/workflows/pull-request.yml` and `.github/workflows/ci.yml`.
- `.github/scripts/detect-changes.mjs` and its test (new pipeline file names, no push/infrastructure handling).
- Root `package.json` `lint:ci` already lints all packages (`pnpm -r lint:ci`); the per-service lint stays available locally.
- Docs mentioning the pipeline: `README.md`, `infrastructure/README.md`, `openspec/specs/pipeline/spec.md` (via sync at archive).
- GitHub: required status check "Quality Gate" is unchanged; the Renovate workflow and its auto-merge keep working.
