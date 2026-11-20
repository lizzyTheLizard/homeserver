# Proposal

## Why

The ruleset on `main` has `strict_required_status_checks_policy: true` on "Quality Gate", so every pull request must be up to date with `main` before it can merge. Dependabot opens many independent pull requests at once; after the first one merges, all others are behind `main`. Dependabot only rebases on a merge conflict, so they stall. The workaround `dependabot-update-branch.yml` merges `main` into one pull request at a time, but that adds a commit of ours to the branch, and Dependabot then refuses to rebase it (for example on a later lockfile conflict). The setup therefore breaks exactly in the conflict case.

Dependency updates are independent of each other, and the pipeline runs the full lint/test/build and deploy again on `main` after every merge. Forcing each pull request to be re-tested on the latest `main` first is serial work that buys little here. The usual answer is to stop requiring up-to-date branches for these pull requests and let Dependabot manage its own branches (it rebases on conflicts by itself).

## What Changes

- Turn off the "require branches to be up to date before merging" setting (`strict_required_status_checks_policy`) in the `main` ruleset. "Quality Gate" stays a required check, squash-only and linear history stay.
- Delete the workflow `.github/workflows/dependabot-update-branch.yml`, so nobody but Dependabot pushes to Dependabot branches again.
- Keep `dependabot-auto-merge.yml` unchanged: it arms auto-merge for patch and minor updates (and approves them); majors stay manual.
- One-time cleanup: pull requests that already carry a merge commit from the removed workflow are recreated with `@dependabot recreate`, so Dependabot owns them again.
- Document the setup and the fallback in `infrastructure/README.md`.

## Capabilities

### New Capabilities

### Modified Capabilities

- `pipeline`: removes the requirement that behind Dependabot pull requests are updated by a workflow; adds a requirement that Dependabot pull requests merge independently of each other and stay under Dependabot's control.

## Impact

- Deleted file `.github/workflows/dependabot-update-branch.yml`; edited `infrastructure/README.md`.
- Repository setting outside the code: the `main` ruleset (id 18465616) is changed with `gh api`; this needs admin rights and is applied by the user or with their approval.
- A pull request can now merge on a base that is not the latest `main`. A broken combination of two updates is caught by the pipeline run on `main`, which tests before it deploys; nothing is deployed on a red run.
- Alternatives considered (merge queue, `@dependabot rebase` comments, grouped updates) are in design.md.
