# Proposal

## Why

The ruleset on `main` requires every pull request to be up to date with `main` before it can merge. Dependabot only rebases a pull request on a merge conflict, so a Dependabot pull request that is merely behind `main` keeps its green "Quality Gate" and its armed auto-merge but never merges. Today about 15 dependency pull requests sit in this state and each has to be updated by hand with `@dependabot rebase`.

## What Changes

- Add a workflow that runs on every push to `main` (and by hand) and brings Dependabot pull requests that are behind `main` up to date, so the already armed auto-merge can finish.
- Update one pull request per run, the oldest one that is behind and has auto-merge armed, and only when no other such pull request is already up to date and still waiting for its checks. Each merge pushes to `main` and so starts the next update, which avoids running the whole pipeline for every pull request after every merge.
- Use the existing `homeserver-automerge` GitHub App token for the update, because a push made with `GITHUB_TOKEN` starts no pipeline run.

## Capabilities

### New Capabilities

### Modified Capabilities

- `pipeline`: adds a requirement that Dependabot pull requests with armed auto-merge are kept up to date with `main`.

## Impact

- New file `.github/workflows/dependabot-update-branch.yml`.
- Uses the existing GitHub App secrets `AUTOMERGE_APP_CLIENT_ID` and `AUTOMERGE_APP_PRIVATE_KEY`; the app needs contents and pull-requests write access, which it already has.
- Each updated pull request gets a merge commit from `main` and re-runs the pipeline; the final squash merge keeps `main` linear.
- Dependabot stops rebasing a pull request that has a commit of its own, which is acceptable because this workflow keeps it current.
