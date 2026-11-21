## MODIFIED Requirements

### Requirement: Patch and minor dependency updates merge automatically and stay current with main

Renovate pull requests for patch and minor updates SHALL be merged automatically once the required "Quality Gate" passed, while the main branch keeps requiring pull requests to be up to date with main. Renovate SHALL bring a pull request that is behind main up to date by rebasing it, and SHALL rebase one that conflicts with main, so that every such pull request eventually merges without manual action regardless of how many are open. Major updates SHALL NOT be merged automatically. No workflow of this repository except the Renovate workflow SHALL push to a Renovate branch.

#### Scenario: Several updates are open
- **WHEN** several patch or minor update pull requests are open and one of them merges
- **THEN** the others are rebased onto the new main without waiting for the next daily run, run the pipeline again and merge once it passed

#### Scenario: An update conflicts with main
- **WHEN** a merge to main leaves another update pull request with a merge conflict
- **THEN** Renovate rebases it, the pipeline runs again and it merges after a passed "Quality Gate"

#### Scenario: Major updates stay manual
- **WHEN** Renovate opens a major update
- **THEN** it is not merged automatically

#### Scenario: A failing update does not merge
- **WHEN** the "Quality Gate" of an update pull request fails
- **THEN** it is not merged and stays open

## ADDED Requirements

### Requirement: Renovate runs as a GitHub Actions workflow

Renovate SHALL run as a workflow of this repository, using the repository's Renovate configuration, and no other Renovate instance (such as the hosted Renovate GitHub App) SHALL act on the repository. The workflow SHALL run every night inside the configured update window, after every push to the main branch, and when started by hand. Runs SHALL NOT overlap. The workflow SHALL authenticate with a token from the repository secret `RENOVATE_TOKEN` so that branch pushes and merges made by Renovate start the pipeline, and SHALL NOT open an onboarding pull request.

#### Scenario: Nightly run
- **WHEN** the nightly schedule fires
- **THEN** the Renovate workflow runs inside the 6 a.m. Zurich window and opens or updates pull requests for outdated dependencies

#### Scenario: A merge to main triggers a run
- **WHEN** a commit is pushed to the main branch, for example by merging a Renovate pull request
- **THEN** the Renovate workflow runs and rebases the open Renovate pull requests that are now behind main

#### Scenario: A run can be started by hand
- **WHEN** the owner dispatches the Renovate workflow
- **THEN** it runs immediately, optionally with a debug log level

#### Scenario: Runs do not overlap
- **WHEN** a run is in progress and another is triggered
- **THEN** the second waits until the first has finished

#### Scenario: Renovate pull requests run the pipeline
- **WHEN** Renovate pushes a branch or merges a pull request
- **THEN** the pipeline starts for it, because the push was made with `RENOVATE_TOKEN` and not with `GITHUB_TOKEN`
