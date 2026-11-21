# Design

## Context

- `.github/renovate.json5` (from the change `switch-to-renovate`) holds the whole update policy: recommended preset, Zurich timezone, `before 6am`, one-day release age, `rebaseWhen: "behind-base-branch"`, platform auto-merge for patch/minor, `prConcurrentLimit: 5`, no `postgres` majors.
- The hosted Mend Renovate app was installed (repository-scoped) about a day ago. Observed: no Renovate pull request, branch, dependency dashboard issue or check exists, so no run has completed; the cause can only be seen on the Mend site.
- The `main` ruleset requires "Quality Gate" and an up-to-date branch (strict); merges and pushes made with `GITHUB_TOKEN` start no workflow runs.
- The only Actions secrets of the repository today are the application secrets and SSH secrets; the old `AUTOMERGE_APP_*` secrets are gone.

## Goals / Non-Goals

**Goals:**
- Renovate runs are visible, startable and debuggable from the repository.
- After each merge the remaining Renovate pull requests are rebased promptly, not only once a day.
- The update policy stays in `.github/renovate.json5`.

**Non-Goals:**
- Changing the update policy, the pipeline, the deploy or the ruleset.
- Self-hosting Renovate on the home server or in a container.

## Decisions

**1. Official `renovatebot/github-action`, pinned to an exact version tag** (chosen at apply time, kept current by Renovate itself, like the other actions). It runs the Renovate container image; the image version is pinned through the action's `renovate-version` default. No custom scripts.

**2. Triggers: `schedule`, `push` to `main`, `workflow_dispatch`.**
- Schedule: cron at 03:00 UTC, which is 04:00 or 05:00 Zurich time, inside `before 6am` in winter and summer; GitHub may delay scheduled runs by minutes, so there is margin.
- Push to `main`: Renovate only creates new branches inside the schedule window, but it keeps existing pull requests up to date at any time (`updateNotScheduled`, default `true`) and arms/merges outside the window too. So a run after each merge rebases the others without creating new pull requests during the day. This replaces the app's webhook behaviour; without it only one pull request could merge per day under the strict ruleset.
- `workflow_dispatch` with a `log-level` input (default `info`, option `debug`) for diagnosing.

**3. Token `RENOVATE_TOKEN` (Actions secret) instead of `GITHUB_TOKEN`.** A branch push or merge by `GITHUB_TOKEN` starts no workflow, so the pipeline would never run for Renovate pull requests and "Quality Gate" would stay pending. Two ways to create the token, the owner chooses:
- Fine-grained personal access token of the owner, repository `homeserver` only: Contents, Pull requests, Issues, Workflows (read/write), Metadata/Commit statuses (read). Simplest; expires and is tied to the owner.
- GitHub App installation token (`actions/create-github-app-token` in a first step; a new App with the same permissions; its client id/private key as secrets). More setup, not tied to a person, tokens are short-lived.
The workflow reads one secret, `RENOVATE_TOKEN`. To use an App later, one step is added in front and `RENOVATE_TOKEN` is replaced by the step output; nothing else changes. Assumption: the PAT is used now. The workflow's own `GITHUB_TOKEN` permissions stay `contents: read` (it is only needed for the checkout).

**4. Self-hosted settings as workflow environment variables, not in `renovate.json5`**: `RENOVATE_REPOSITORIES: ${{ github.repository }}`, `RENOVATE_ONBOARDING: "false"` and `RENOVATE_REQUIRE_CONFIG: required` (the repository config is the only config; a missing file is an error rather than a silent default), `LOG_LEVEL` from the dispatch input. The repository's `renovate.json5` remains valid for any host. The action is pointed at the same file with `configurationFile` unset: Renovate finds `.github/renovate.json5` in the repository itself, so no config file is checked out into the runner by the action.

**5. `concurrency: { group: renovate, cancel-in-progress: false }`.** Two simultaneous Renovate runs would race on the same branches; a queued run starts after the current one. At most one pending run is kept by GitHub, which is enough because every run looks at the whole repository.

**6. Uninstall the hosted app.** Two Renovate instances on one repository fight over branches and the dashboard. Uninstall happens after the first successful manual run of the workflow, so there is no gap longer than necessary.

**Rejected alternatives:** *keep the hosted app and debug it with Mend* (a black box; the user asked to replace it); *run only the nightly schedule* (the strict ruleset would then merge one pull request per day); *`GITHUB_TOKEN`* (starts no pipeline); *Renovate on the home server* (more to operate, outside the repository).

## Risks / Trade-offs

- The token is a long-lived credential with write access to code and workflows; scope it to this repository only and set an expiry reminder (PAT) or use an App.
- A push to `main` fires one Renovate run; a Renovate merge to `main` therefore starts a run, which may rebase the next pull request, whose pipeline run then merges it: a chain of about one pipeline run per pull request, as before.
- Renovate's own merge/push on `main` runs `Pipeline` and `Renovate` concurrently; they are independent.
- If a scheduled run is delayed past 6 a.m. Zurich time Renovate creates no new pull requests that day (existing ones are still updated); acceptable and visible in the log.
- Public cron schedules of a repository are disabled by GitHub after 60 days without repository activity; this repository is active, and any push to `main` also runs the workflow.

## Migration Plan

1. Merge the change (workflow on `main`).
2. Create the token and the secret `RENOVATE_TOKEN`.
3. Dispatch the workflow once, check the log and that the Dependency Dashboard issue and the first pull requests appear.
4. Uninstall the Renovate GitHub App (github.com → Settings → Applications → Renovate → Uninstall).
Rollback: disable the workflow and reinstall the app.
