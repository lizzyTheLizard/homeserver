# Proposal

## Why

The hosted Renovate GitHub App was installed a day ago but has not completed a single run on this repository: no pull request, no Dependency Dashboard issue, no check, and the owner has no insight into why. The hosted app is a black box (its logs live on a third-party site, its runs cannot be started from the repository). Running Renovate as a GitHub Actions workflow of this repository makes every run visible in the Actions tab, lets the owner start it by hand, and lets it react to merges so the pull requests that are behind `main` are rebased right away instead of once a day.

## What Changes

- Add `.github/workflows/renovate.yml`: runs the official `renovatebot/github-action` with the existing `.github/renovate.json5`. It runs daily at night (inside the "before 6 a.m. Zurich time" window), after every push to `main` (so open Renovate pull requests are rebased onto the new `main` after each merge), and by hand (`workflow_dispatch`, with an optional debug log level).
- The workflow authenticates with a token stored as the Actions secret `RENOVATE_TOKEN`, not with `GITHUB_TOKEN`: pushes and merges made with `GITHUB_TOKEN` start no workflow run, so Renovate pull requests would never run the pipeline.
- Self-hosted settings that the hosted app set implicitly (repository, no onboarding pull request) are passed as environment variables of the workflow; `.github/renovate.json5` stays the single source of the update policy and changes only where the move requires it.
- Document the setup in `infrastructure/README.md` (replaces "hosted Renovate GitHub App").
- One-time rollout outside the code: create the token and the secret, uninstall the Renovate GitHub App from the repository (two Renovate instances would fight over the same branches), start the workflow once by hand.

## Capabilities

### New Capabilities

### Modified Capabilities

- `pipeline`: Renovate runs as a GitHub Actions workflow (daily, after merges to `main`, and on demand) with a token that starts the pipeline; the "no workflow pushes to a Renovate branch" rule makes an exception for that workflow.

## Impact

- New: `.github/workflows/renovate.yml`. Edited: `infrastructure/README.md`, possibly `.github/renovate.json5` (comment/options needed for self-hosted runs). The pipeline treats workflows other than `pipeline.yml`/`service.yml` as not changing any service, so adding the workflow does not trigger service builds.
- The owner must create the token (fine-grained personal access token or GitHub App installation token, see design.md) and the secret `RENOVATE_TOKEN`; this cannot be done from the code.
- The hosted Renovate GitHub App must be uninstalled (or suspended) once the workflow works.
- Uses Actions minutes of the repository (a few minutes per run; a run on every push to `main` is small as Renovate exits quickly when nothing changed).
- Alternatives (keep the hosted app and investigate with Mend, run Renovate on the home server) are in design.md.
