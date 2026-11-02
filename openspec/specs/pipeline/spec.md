# pipeline Specification

## Purpose

Defines the continuous-integration and test work: the GitHub pipeline that lints, tests, builds and deploys the stack, the test suites that run locally and in CI, and the Docker image builds that feed the deployment. The stack smoke suite is not part of this capability.

## Requirements

### Requirement: One pipeline runs for pull requests, the main branch and on demand

The repository SHALL have exactly one build-and-deploy pipeline. It SHALL run when a pull request is opened, updated or reopened, when a commit is pushed to the main branch, and when dispatched by hand. It SHALL NOT run for a push to any other branch.

#### Scenario: A pull request runs the pipeline
- **WHEN** a pull request is opened, a commit is pushed to its branch, or it is reopened
- **THEN** the pipeline runs once for the pull request

#### Scenario: A merge to main runs the pipeline
- **WHEN** a commit reaches the main branch, for example by merging a pull request
- **THEN** the pipeline runs once for that commit

#### Scenario: A feature branch without a pull request does not run the pipeline
- **WHEN** a commit is pushed to a branch other than main that has no open pull request
- **THEN** no pipeline run starts

#### Scenario: A manual run is possible
- **WHEN** the pipeline is dispatched by hand
- **THEN** it runs and treats every service and the infrastructure as changed

#### Scenario: A Dependabot auto-merge runs the pipeline
- **WHEN** a Dependabot pull request is merged automatically after its "Quality Gate" passed
- **THEN** the pipeline runs on main for the merge commit and deploys the changed services

### Requirement: The pipeline first detects what changed

The pipeline SHALL start by determining which of the web application, assistant, WhatsApp bridge, Wichteln and development machine services and whether the infrastructure changed, comparing a pull request against its base branch and a push to main against the previous main commit. All later stages SHALL act only on what this stage reports as changed.

#### Scenario: A change inside a service folder
- **WHEN** the compared commits change files under `services/<name>/` only
- **THEN** only that service is reported as changed

#### Scenario: A change to shared workspace files
- **WHEN** the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc` or the shared setup action changes
- **THEN** every service is reported as changed

#### Scenario: A change to the pipeline definition
- **WHEN** the pipeline's own workflow or any of its actions changes
- **THEN** every service and the infrastructure are reported as changed

#### Scenario: A change to the stack definition
- **WHEN** files under `infrastructure/` change
- **THEN** the infrastructure is reported as changed

#### Scenario: Nothing relevant changed
- **WHEN** the compared commits change only files outside services, infrastructure, shared workspace files and the pipeline, for example only `openspec/`
- **THEN** no service and no infrastructure is reported as changed

#### Scenario: The previous main commit cannot be compared
- **WHEN** a push to main has no comparable previous commit, for example the first push or a forced history rewrite
- **THEN** every service and the infrastructure are reported as changed

### Requirement: Changed services are linted, tested and built

For each service reported as changed, the pipeline SHALL lint it, run its tests and build its image. A service that has no lint or test task, such as the development machine, SHALL only be built. Services not reported as changed SHALL be skipped in this stage.

#### Scenario: A changed service is checked
- **WHEN** the web application is reported as changed
- **THEN** its lint, its three test projects and its image build run

#### Scenario: An unchanged service is skipped
- **WHEN** the assistant is not reported as changed
- **THEN** the assistant's lint, test and build jobs are skipped

#### Scenario: A pull request builds without publishing
- **WHEN** the pipeline runs for a pull request
- **THEN** the changed services' images are built but not published to the registry

### Requirement: Each changed service's image is published from main

The pipeline SHALL build the web application, assistant, WhatsApp bridge, Wichteln and development machine as `linux/amd64` images named `ghcr.io/<owner>/homeserver-<name>:latest`, each from its own service's folder and Dockerfile, SHALL tag the web application image with the commit, branch, pipeline run and build time, and SHALL publish an image to GitHub Container Registry only on the main branch, only when its service changed and only after its lint and tests passed.

#### Scenario: A changed service's image is published on main
- **WHEN** the pipeline runs on main and the WhatsApp bridge is reported as changed and its lint and tests pass
- **THEN** `ghcr.io/<owner>/homeserver-whatsapp:latest` is built from `services/whatsapp/` and published

#### Scenario: A failing check blocks publishing
- **WHEN** a changed service's lint or tests fail
- **THEN** its image is not published

#### Scenario: The application image carries its revision
- **WHEN** the web application image is built
- **THEN** it records the commit, branch, pipeline run and build time that produced it

### Requirement: One quality gate decides the run

The pipeline SHALL end with one job named "Quality Gate" that depends on every other job of the run and runs even when those jobs failed, were cancelled or were skipped. It SHALL fail when any job failed or was cancelled and SHALL pass when every job either succeeded or was skipped. "Quality Gate" SHALL be the only status check required to merge into main.

#### Scenario: Everything passes
- **WHEN** every job of the run succeeds
- **THEN** "Quality Gate" passes

#### Scenario: Unchanged services were skipped
- **WHEN** only the web application changed, its jobs succeed and every other service's jobs are skipped
- **THEN** "Quality Gate" passes

#### Scenario: A job fails
- **WHEN** any job of the run fails or is cancelled, including change detection, the change guard or a deploy
- **THEN** "Quality Gate" still runs and fails

#### Scenario: Every stage fails
- **WHEN** change detection fails so that every later job is skipped
- **THEN** "Quality Gate" still runs and fails

#### Scenario: A pull request waits for the gate only
- **WHEN** a pull request targets main
- **THEN** "Quality Gate" is the only required status check, and the pull request can merge once it passes

### Requirement: Changed services are deployed from main

The deploy SHALL run only for a run on the main branch, regardless of who started it, and only after the deployed service's lint, tests and image publish succeeded. A service that has no lint or test task, such as the development machine, SHALL be deployed once its image publish succeeded; its missing lint or test SHALL NOT block the deploy. For each changed service it SHALL synchronise the stack definition to the server, pull that service's published image and recreate only that service. Concurrent deploys on the server SHALL be serialised.

#### Scenario: Deploy publishes the stack
- **WHEN** the pipeline runs on main, the assistant is reported as changed and its image was published
- **THEN** the stack definition is synchronised to the server and the assistant's container is recreated from the new image

#### Scenario: A service without lint or tests is deployed
- **WHEN** the pipeline runs on main, only the development machine is reported as changed and its image was published
- **THEN** the development machine's container is recreated from the new image

#### Scenario: A failing check blocks the deploy
- **WHEN** a changed service's lint, tests or image build fail on main
- **THEN** that service is not deployed

#### Scenario: A dependabot merge deploys
- **WHEN** a dependency update from the dependency bot is merged and the pipeline runs on main for it
- **THEN** the changed services are deployed like for any other merge

#### Scenario: A pull request never deploys
- **WHEN** the pipeline runs for a pull request
- **THEN** no deploy runs

#### Scenario: An infrastructure change deploys the whole stack instead
- **WHEN** the infrastructure is reported as changed on main
- **THEN** no per-service deploy runs and the whole stack is deployed once after every changed image was published

### Requirement: Every package is linted and tested

The pipeline SHALL be able to lint every package and SHALL run the assistant's tests, the web application's three test projects, the WhatsApp bridge's tests and Wichteln's tests, each only when its service is reported as changed. A failing job SHALL stop the jobs that depend on it.

#### Scenario: All checks run
- **WHEN** every service is reported as changed
- **THEN** the lint and test jobs of every service and the five image builds run

#### Scenario: A failing check stops its dependants
- **WHEN** any lint, test or build job fails
- **THEN** the publish and deploy of that service do not run

### Requirement: Linting can fix locally and only reports in CI

The linting task SHALL apply fixes when run locally and SHALL only report problems without changing files when run for CI.

#### Scenario: Local lint fixes files
- **WHEN** the linting task runs locally
- **THEN** it applies the available fixes

#### Scenario: CI lint does not change files
- **WHEN** the linting task runs for CI
- **THEN** it reports problems without modifying files

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
