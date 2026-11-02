# Proposal

## Why

The build is split over six workflows (`web.yml`, `assistant.yml`, `whatsapp.yml`, `wichteln.yml`,
`dev-machine.yml`, `infrastructure.yml`), each repeating its own change detection, gate and deploy,
and the main-branch ruleset has to list five separate "Gate …" checks. The OpenSpec change guard was
lost when the per-service workflows replaced `homeserver.yml`, so pull requests are no longer
checked for an archived, synced change. One pipeline with a single quality gate makes the flow
readable and gives pull requests exactly one check to require.

## What Changes

- **BREAKING (CI)**: Replace the six workflows with one pipeline workflow. It runs for every pull
  request that is opened, updated or reopened, for every push to `main` (the merge) and on manual
  dispatch. A push to a feature branch without a pull request does not run it.
- The pipeline runs in stages:
  1. **Change detection** — determines which services (web, assistant, WhatsApp, Wichteln, dev
     machine) and whether the infrastructure changed, against the pull request's base or, on `main`,
     against the previous `main` commit. Shared workspace files and the pipeline's own definition
     count as a change to every service they affect.
  2. **Checks** — lint, test and image build for each changed service only, plus the change guard
     on pull requests.
  3. **Publish and deploy** — on `main` only: publish the changed services' images to GHCR and
     deploy them; an infrastructure change deploys the whole stack instead.
  4. **Quality gate** — one job, "Quality Gate", that always runs, even when every earlier job
     failed or was cancelled, and passes only if every job either succeeded or was skipped because
     nothing relevant changed.
- Restore the OpenSpec change guard as a pipeline job: a pull request that touches
  `openspec/changes/` must add exactly one archived change, `openspec/changes/archive/<date>-<name>/`,
  whose `<name>` equals the branch, must contain no in-flight change folder, and every delta spec of
  that change must have its main spec under `openspec/specs/` updated in the same pull request.
- Change the `main` ruleset so the only required status check is "Quality Gate", replacing the five
  "Gate …" checks.
- Remove the stale `pipeline` requirements for the "All Build Check Success" job and the
  artifact-based deploy, which contradict the single pipeline, and drop the rule that a Dependabot
  merge is not deployed: Dependabot merges deploy like any other merge.
- `dependabot-auto-merge.yml` turns on auto-merge with a GitHub App token instead of `GITHUB_TOKEN`.
  Merges made with `GITHUB_TOKEN` don't start workflow runs, so the merge to `main` used to start no
  pipeline and nothing was deployed.
- Take the stack smoke suite requirements out of `pipeline`: the smoke suite is being moved out of
  the pipeline and is specified again by its own change.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `pipeline`: one pipeline with triggers limited to pull requests, `main` and manual runs, change
  detection driving per-service lint/test/build/publish/deploy, and a single always-running quality
  gate; Dependabot merges deploy; the aggregated-check requirement is removed and the smoke-suite
  requirements leave this capability because the smoke suite is being moved.
- `ci/change-guard`: the guard runs as part of the pipeline, also rejects an in-flight change folder
  left anywhere in the pull request, and checks that each delta spec's own main spec was synced
  rather than any file under `openspec/specs/`.
- `infrastructure`: the infrastructure deploy is triggered by the single pipeline when the stack
  definition or the pipeline's deploy definition changes on `main`, and replaces the per-service
  deploys of that run.

## Impact

- `.github/workflows/`: `web.yml`, `assistant.yml`, `whatsapp.yml`, `wichteln.yml`,
  `dev-machine.yml` and `infrastructure.yml` are replaced by one `pipeline.yml`.
- `dependabot-auto-merge.yml` gets its token from a GitHub App. This needs a GitHub App, set up by
  hand, with Contents and Pull requests read/write access, installed on the repository. Its client ID and
  private key are stored as Dependabot secrets `AUTOMERGE_APP_CLIENT_ID` and `AUTOMERGE_APP_PRIVATE_KEY`.
- `.github/actions/`: the existing `setup`, `build-publish`, `deploy-service` and
  `deploy-infrastructure` actions are reused; a change-guard script is added under `.github/`.
- GitHub repository ruleset `default` on `main`: required status checks change to "Quality Gate".
- `infrastructure/README.md` (§6 Deployment) and `CLAUDE.md` describe the single pipeline.
