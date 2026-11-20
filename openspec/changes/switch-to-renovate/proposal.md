# Proposal

## Why

The ruleset on `main` requires every pull request to be up to date with `main` (strict required status check "Quality Gate"). Dependabot opens many independent pull requests at once and only rebases one on a merge conflict, never because it is merely behind `main`. After the first merge the others stall. The workaround `dependabot-update-branch.yml` merges `main` into one pull request at a time, but its commit makes Dependabot refuse to rebase that branch later, so the conflict case still breaks. Dependabot cannot do what is needed here; Renovate can: it rebases its own pull requests whenever they are behind the base branch, resolves conflicts by rebasing again, and merges patch and minor updates automatically. The strict policy stays, so every merge was tested on top of the current `main`.

## What Changes

- Replace Dependabot version updates by Renovate: add a Renovate configuration with one pull request per dependency for npm/pnpm, GitHub Actions, Dockerfiles and the docker-compose file, a weekly schedule, a one-day minimum release age, and the existing `postgres` major-version ignore rule.
- Patch and minor updates are merged automatically with GitHub's auto-merge once "Quality Gate" passed; major updates stay open for manual review.
- Renovate keeps its pull requests up to date with `main` (rebase when behind or conflicting). The number of open Renovate pull requests is limited so that the rebase rounds after each merge stay small.
- Delete `.github/dependabot.yml`, `.github/workflows/dependabot-auto-merge.yml` and `.github/workflows/dependabot-update-branch.yml`. The `main` ruleset is not changed.
- One-time cleanup: close the open Dependabot pull requests; Renovate opens its own.
- Document the setup in `infrastructure/README.md` and adapt the pipeline-script test that lists the bot configuration file as a non-pipeline file.

## Capabilities

### New Capabilities

### Modified Capabilities

- `pipeline`: the dependency bot is Renovate instead of Dependabot (Docker image coverage, postgres major ignore, merge of updates); the requirement that a workflow updates behind Dependabot pull requests is removed; a new requirement describes automatic merge of patch and minor updates that stay up to date with `main`.

## Impact

- Deleted: the three Dependabot files above. New: `.github/renovate.json5`. Edited: `infrastructure/README.md`, `.github/scripts/detect-changes.test.mjs`, comment in `infrastructure/db-backup/Dockerfile`.
- Renovate must be installed on the repository: the hosted "Renovate" GitHub App (free) is installed by the repository owner in the GitHub UI, which cannot be done from the code. Installing it after the configuration is on `main` avoids the onboarding pull request.
- The GitHub App `homeserver-automerge` and its secrets `AUTOMERGE_APP_CLIENT_ID` / `AUTOMERGE_APP_PRIVATE_KEY` are no longer used and can be removed from the repository (optional).
- Dependabot security alerts are a separate GitHub feature and stay as they are.
- Alternatives (keep Dependabot with comment-driven rebases, relaxed ruleset, merge queue, grouping) are in design.md.
