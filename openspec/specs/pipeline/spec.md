# pipeline Specification

## Purpose

Defines the continuous-integration and test work: the GitHub pipeline that lints, tests, builds and deploys the stack, the test suites that run locally and in CI, and the Docker image builds that feed the deployment. The stack smoke suite is not part of this capability.

## Requirements

### Requirement: One quality gate decides the run

The "Pull request" pipeline SHALL end with one job named "Quality Gate" that depends on every other job of the run and runs even when those jobs failed, were cancelled or were skipped. It SHALL fail when any job failed or was cancelled and SHALL pass when every job either succeeded or was skipped. "Quality Gate" SHALL be the only status check required to merge into main. The "CI" pipeline SHALL have no quality gate.

#### Scenario: Everything passes
- **WHEN** every job of the pull request run succeeds
- **THEN** "Quality Gate" passes

#### Scenario: Unchanged services were skipped
- **WHEN** only the web application changed, its jobs succeed and every other service's test job is skipped
- **THEN** "Quality Gate" passes

#### Scenario: A job fails
- **WHEN** any job of the run fails or is cancelled, including lint, change detection, the change guard or the stack start
- **THEN** "Quality Gate" still runs and fails

#### Scenario: Every stage fails
- **WHEN** change detection fails so that every later job is skipped
- **THEN** "Quality Gate" still runs and fails

#### Scenario: A pull request waits for the gate only
- **WHEN** a pull request targets main
- **THEN** "Quality Gate" is the only required status check, and the pull request can merge once it passes

### Requirement: Linting can fix locally and only reports in CI

The linting task SHALL apply fixes when run locally and SHALL only report problems without changing files when run for CI.

#### Scenario: Local lint fixes files
- **WHEN** the linting task runs locally
- **THEN** it applies the available fixes

#### Scenario: CI lint does not change files
- **WHEN** the linting task runs for CI
- **THEN** it reports problems without modifying files

### Requirement: All packages are linted with one shared configuration

The web application and Wichteln SHALL be linted against a single lint configuration at the repository root, and no package SHALL carry its own lint configuration file.

#### Scenario: Every package uses the same rules
- **WHEN** any package is linted
- **THEN** the shared root configuration applies, including its performance, style and curated restriction rules

#### Scenario: The shared configuration is a shared workspace file
- **WHEN** the shared lint or format configuration changes
- **THEN** every service is reported as changed and tested

### Requirement: Linting checks code formatting

The linting task SHALL check that code, style, JSON, YAML, Markdown and HTML files of the services follow the project's formatting conventions (2-space indentation, single quotes, no semicolons, a maximum line width, consistent whitespace and wrapping). Locally the linting task SHALL reformat non-conforming files; for CI it SHALL fail on them without changing files.

#### Scenario: A formatting violation fails CI lint
- **WHEN** a changed file uses double quotes or a wrong indentation and the linting task runs for CI
- **THEN** the lint job fails and reports the file

#### Scenario: A formatting violation is fixed locally
- **WHEN** the linting task runs locally on a file with such a violation
- **THEN** the file is rewritten to conform

### Requirement: The web application's tests run as three parallel projects

The web application's test suite SHALL consist of three projects that run in parallel: a unit project for the fast tests, an integration project for the server actions and a Storybook project for the component interaction tests.

#### Scenario: Unit project runs the fast tests
- **WHEN** the unit project runs
- **THEN** it executes the unit test files and excludes the server tests

#### Scenario: Integration project runs the server tests that exist
- **WHEN** the integration project runs
- **THEN** it executes every `server.tests.ts` file that sits beside a server action, and an action without such a file is simply not covered

#### Scenario: Storybook project runs the interaction tests
- **WHEN** the Storybook project runs
- **THEN** it executes the component stories' interaction tests in a browser

### Requirement: Integration tests run against an in-memory database with the migrations

The integration tests SHALL run against an in-memory database that has been seeded with all of the project's migrations, so the tests exercise the real schema without touching a shared database.

#### Scenario: Integration test uses the real schema
- **WHEN** an integration test runs
- **THEN** it runs against an in-memory database carrying the project's migrations

### Requirement: Storybook interaction tests need a browser

The Storybook project SHALL run its interaction tests in a Chromium browser, and the pipeline SHALL install that browser before running the project.

#### Scenario: The pipeline installs the browser
- **WHEN** the Storybook job runs in the pipeline
- **THEN** it installs Chromium before running the interaction tests

#### Scenario: Missing browser blocks the Storybook project
- **WHEN** the Storybook project runs on a machine without the browser binary
- **THEN** the interaction tests cannot run until the browser is installed

### Requirement: Docker base images are pinned to exact versions

Every `FROM` instruction in the repository's Dockerfiles that loads an image from outside the repository SHALL use an exact version tag and never `latest`, a missing tag or a floating major tag. Stages that build on an earlier stage of the same Dockerfile are exempt.

#### Scenario: Base image is pinned
- **WHEN** a Dockerfile starts a stage from an external image such as `node` or `alpine`
- **THEN** the tag names an exact version

### Requirement: Renovate keeps dependencies and Docker images up to date

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file daily (before 6 a.m. Zurich time) and open one pull request per dependency update, only for versions at least one day old. Major-version updates of `postgres` SHALL be ignored because they need a data migration and must match the PostgreSQL client of the backup image. Dependabot SHALL NOT open version-update pull requests.

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

### Requirement: Pull requests and merges to main run separate pipelines

The repository SHALL have two pipelines: "Pull request", which runs when a pull request is opened, updated or reopened, and "CI", which runs when a commit is pushed to the main branch and when dispatched by hand. Neither SHALL run for a push to any other branch, and "Pull request" SHALL NOT run for a push to main.

#### Scenario: A pull request runs the pull request pipeline
- **WHEN** a pull request is opened, a commit is pushed to its branch, or it is reopened
- **THEN** the "Pull request" pipeline runs once and "CI" does not run

#### Scenario: A merge to main runs the CI pipeline
- **WHEN** a commit reaches the main branch, for example by merging a pull request
- **THEN** the "CI" pipeline runs once for that commit and "Pull request" does not run

#### Scenario: A feature branch without a pull request runs nothing
- **WHEN** a commit is pushed to a branch other than main that has no open pull request
- **THEN** no pipeline run starts

#### Scenario: A manual CI run is possible
- **WHEN** the "CI" pipeline is dispatched by hand
- **THEN** it runs like a merge to main

#### Scenario: A superseded pull request run is cancelled
- **WHEN** a new commit is pushed to a pull request while its pipeline is running
- **THEN** the running pipeline is cancelled, whereas runs on main queue and are never interrupted

### Requirement: The pull request pipeline lints the whole repository

The "Pull request" pipeline SHALL lint every package of the repository with one job started from the repository root, regardless of which services changed. This job SHALL run in parallel to change detection and the change guard and SHALL NOT wait for them.

#### Scenario: Lint always covers every package
- **WHEN** a pull request changes only Wichteln
- **THEN** the lint job still checks the web application and Wichteln

#### Scenario: Lint runs in parallel to detection
- **WHEN** the "Pull request" pipeline starts
- **THEN** the lint job, change detection and the change guard start at the same time

### Requirement: The pull request pipeline tests only changed services

For each of the web application and Wichteln reported as changed, the "Pull request" pipeline SHALL run that service's tests once change detection has finished. A service not reported as changed SHALL have its tests skipped. The development machine has no tests.

#### Scenario: A changed service is tested
- **WHEN** the web application is reported as changed
- **THEN** its unit, integration and Storybook test projects run

#### Scenario: An unchanged service is skipped
- **WHEN** Wichteln is not reported as changed
- **THEN** Wichteln's test job is skipped

#### Scenario: A failing test fails the pipeline
- **WHEN** a test job fails
- **THEN** the "Quality Gate" fails

### Requirement: The CI pipeline publishes every image

The "CI" pipeline SHALL build the web application, Wichteln and development machine as `linux/amd64` images named `ghcr.io/<owner>/homeserver-<name>:latest`, each from its own service's folder and Dockerfile, and SHALL publish all three to GitHub Container Registry, whether or not their service changed. It SHALL tag the web application image with the commit, branch, pipeline run and build time. It SHALL NOT lint, run tests or start the stack, since the "Pull request" pipeline did.

#### Scenario: Every image is published on a merge
- **WHEN** a pull request that only changed Wichteln is merged to main
- **THEN** the web application, Wichteln and development machine images are built and published

#### Scenario: The application image carries its revision
- **WHEN** the web application image is built
- **THEN** it records the commit, branch, pipeline run and build time that produced it

#### Scenario: Main does not repeat the pull request checks
- **WHEN** the "CI" pipeline runs
- **THEN** no lint, test, change guard or stack start job runs

### Requirement: The CI pipeline deploys the whole stack

After all three images were published, the "CI" pipeline SHALL synchronise the stack definition to the server, pull the images and recreate the whole stack once. It SHALL NOT deploy when an image build or publish failed or was cancelled. Concurrent deploys on the server SHALL be serialised. There SHALL be no per-service deploy.

#### Scenario: A merge deploys the stack
- **WHEN** the "CI" pipeline has published all images
- **THEN** the stack definition is synchronised to the server and the whole stack is recreated from the published images

#### Scenario: A failing image blocks the deploy
- **WHEN** any image build or publish fails
- **THEN** nothing is deployed

#### Scenario: A dependency bot merge deploys
- **WHEN** a dependency update from the dependency bot is merged
- **THEN** the "CI" pipeline runs on main for the merge commit and deploys like for any other merge

#### Scenario: A pull request never deploys
- **WHEN** the "Pull request" pipeline runs
- **THEN** no image is published and nothing is deployed

### Requirement: The pull request pipeline detects what changed

The "Pull request" pipeline SHALL determine which of the web application, Wichteln and development machine services and whether the infrastructure changed, comparing the pull request against its base branch. Its test jobs, its stack start and the image builds of its stack start SHALL act only on what this stage reports as changed. The "CI" pipeline SHALL NOT detect changes.

#### Scenario: A change inside a service folder
- **WHEN** the pull request changes files under `services/<name>/` only
- **THEN** only that service is reported as changed

#### Scenario: A change to shared workspace files
- **WHEN** the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, the shared lint and format configuration (`.oxlintrc.json`, `.oxfmtrc.json`) or the shared setup action changes
- **THEN** every service is reported as changed

#### Scenario: A change to the pipeline definition
- **WHEN** either pipeline's workflow, the scripts it runs or any of its actions changes
- **THEN** every service and the infrastructure are reported as changed

#### Scenario: A change to the stack definition
- **WHEN** files under `infrastructure/` change
- **THEN** the infrastructure is reported as changed, and a service only when its own files changed

#### Scenario: Nothing relevant changed
- **WHEN** the pull request changes only files outside services, infrastructure, shared workspace files and the pipeline, for example only `openspec/`
- **THEN** no service and no infrastructure is reported as changed

### Requirement: The pull request pipeline starts the stack with the changed images

When any service or the infrastructure is reported as changed, the "Pull request" pipeline SHALL start the whole docker-compose stack with `docker compose up` on a pipeline runner, using placeholder configuration values. For each service reported as changed it SHALL build the image from the pull request's sources and run the stack with it; for every other service it SHALL use the published `latest` image. It SHALL NOT publish any image.

#### Scenario: A changed service runs with its own image
- **WHEN** the web application is reported as changed
- **THEN** the stack runs the web application image built from the pull request and not the published one

#### Scenario: An unchanged service uses the published image
- **WHEN** Wichteln is not reported as changed
- **THEN** its image is not built and the stack uses the published `latest` Wichteln image

#### Scenario: A stack definition change starts the stack
- **WHEN** only files under `infrastructure/` changed
- **THEN** the stack starts with the changed definition and the published `latest` images

#### Scenario: A documentation-only pull request skips the stack
- **WHEN** no service and not the infrastructure is reported as changed, for example only `openspec/` changed
- **THEN** the stack start is skipped and does not block the "Quality Gate"

### Requirement: The stack start must be healthy and runs beside the tests

The stack start SHALL pass only when every container is running and, where it defines a health check, healthy within a bounded time. It SHALL start after change detection, in parallel to the tests, and SHALL perform no other check: no request to a service and no query to the name server.

#### Scenario: A healthy stack passes
- **WHEN** every container of the stack reaches the running and healthy state in time
- **THEN** the stack start-up stage passes

#### Scenario: A failing container fails the stage
- **WHEN** a container exits or does not become healthy in time
- **THEN** the stage fails and the "Quality Gate" fails

#### Scenario: The stack starts in parallel to the tests
- **WHEN** change detection has finished
- **THEN** the stack start begins without waiting for the test jobs
