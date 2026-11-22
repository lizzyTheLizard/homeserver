# Spec Delta

## MODIFIED Requirements

### Requirement: Renovate keeps dependencies and Docker images up to date

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file daily and open one pull request per dependency update, only for versions at least one day old. Major-version updates of `postgres` SHALL be ignored because they need a data migration and must match the PostgreSQL client of the backup image. Dependabot SHALL NOT open version-update pull requests.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists in `services/web`, `services/wichteln`, `services/dev-machine` or `infrastructure/db-backup`
- **THEN** Renovate checks its images

#### Scenario: Compose images are covered
- **WHEN** a newer version of a pinned image in `infrastructure/docker-compose.yml` is released
- **THEN** Renovate opens a pull request that changes the tag

#### Scenario: One pull request per dependency
- **WHEN** several dependencies have newer versions
- **THEN** each update has its own pull request

#### Scenario: PostgreSQL major upgrades are not proposed
- **WHEN** a new major version of `postgres` is released
- **THEN** Renovate does not open a pull request for it

### Requirement: Renovate runs as a GitHub Actions workflow

Renovate SHALL run as a workflow of this repository, using the repository's Renovate configuration, and no other Renovate instance (such as the hosted Renovate GitHub App) SHALL act on the repository. The workflow SHALL run every night, after every push to the main branch, and when started by hand, and the repository's Renovate configuration SHALL NOT restrict when it may act. Runs SHALL NOT overlap. The workflow SHALL authenticate with a token from the repository secret `RENOVATE_TOKEN` so that branch pushes and merges made by Renovate start the pipeline, and SHALL NOT open an onboarding pull request.

#### Scenario: Nightly run
- **WHEN** the nightly schedule fires
- **THEN** the Renovate workflow runs and opens or updates pull requests for outdated dependencies

#### Scenario: A merge to main triggers a run
- **WHEN** a commit is pushed to the main branch, for example by merging a Renovate pull request
- **THEN** the Renovate workflow runs and rebases the open Renovate pull requests that are now behind main, at any time of day

#### Scenario: A run can be started by hand
- **WHEN** the owner dispatches the Renovate workflow at any time of day
- **THEN** it runs immediately, optionally with a debug log level, and opens or updates pull requests without waiting for a time window

#### Scenario: Runs do not overlap
- **WHEN** a run is in progress and another is triggered
- **THEN** the second waits until the first has finished

#### Scenario: Renovate pull requests run the pipeline
- **WHEN** Renovate pushes a branch or merges a pull request
- **THEN** the pipeline starts for it, because the push was made with `RENOVATE_TOKEN` and not with `GITHUB_TOKEN`

## ADDED Requirements

### Requirement: Renovate commits are authored by the owner

The Renovate workflow SHALL author its commits with the owner's GitHub noreply identity and SHALL NOT use Renovate's default author address.

#### Scenario: A Renovate commit has the owner as author
- **WHEN** Renovate creates or rebases a branch
- **THEN** the commits have the owner's noreply address as author and not `renovate@whitesourcesoftware.com`

#### Scenario: No default-author warning
- **WHEN** a Renovate run starts
- **THEN** its log contains no warning about the default `gitAuthor` address
