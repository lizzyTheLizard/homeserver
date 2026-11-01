# pipeline Specification

## Purpose

Defines the continuous-integration and test work: the GitHub pipeline that lints, tests, builds and deploys the stack, the test suites that run locally and in CI, and the Docker image builds that feed the smoke suite and the deployment.

## Requirements

### Requirement: The pipeline runs on every push and on demand

The pipeline SHALL run on every push to any branch and on manual dispatch, and SHALL NOT run on pull requests, so the required merge check is the aggregate the pipeline publishes for a push.

#### Scenario: A push runs the pipeline
- **WHEN** a commit is pushed to any branch
- **THEN** the linting, test and build jobs run

#### Scenario: A manual run is possible
- **WHEN** the pipeline is dispatched by hand
- **THEN** the same jobs run as for a push

### Requirement: Every package is linted and tested

The pipeline SHALL lint every package and SHALL run the assistant's tests, the web application's three test projects and the WhatsApp bridge's tests, and SHALL run the stack smoke suite in addition. A failing job SHALL stop the jobs that depend on it.

#### Scenario: All checks run
- **WHEN** a push reaches the pipeline
- **THEN** the lint job, the five test jobs and the four image builds run

#### Scenario: A failing check stops its dependants
- **WHEN** any lint, test or build job fails
- **THEN** the smoke suite and the deploy do not run

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

### Requirement: Four images are built on every push

The pipeline SHALL build the application, the assistant, the WhatsApp bridge and the development machine as `linux/amd64` images named `homeserver`, `homeserver-assistant`, `whatsapp-bridge` and `homeserver-dev-machine`, SHALL tag the application image with the deployed revision's commit, branch, pipeline run and build time, and SHALL upload each image as a build artifact.

#### Scenario: All four images are built
- **WHEN** a push reaches the pipeline
- **THEN** all four images are built and uploaded as artifacts

#### Scenario: The application image carries its revision
- **WHEN** the application image is built
- **THEN** it records the commit, branch, pipeline run and build time that produced it

### Requirement: The stack smoke suite runs against the built images

The pipeline SHALL run a stack smoke suite that depends on all four image builds, SHALL bootstrap the stack from the uploaded artifacts so that the four built images are loaded rather than rebuilt, SHALL remove the stack and its volumes afterwards even when a check fails, and SHALL expose the service logs when a check fails.

#### Scenario: Smoke suite tests the built images
- **WHEN** the smoke suite job starts
- **THEN** it downloads and loads the image artifacts produced by the build jobs and boots the stack with them

#### Scenario: Clean teardown on failure
- **WHEN** one or more checks fail
- **THEN** the stack is still torn down and no orphan containers remain

#### Scenario: Logs are surfaced on failure
- **WHEN** a check fails
- **THEN** the stack's logs are printed to the run

### Requirement: Infrastructure service checks

The suite SHALL assert that SSH on port 2222 accepts TCP connections, bind9 answers DNS queries, Dozzle serves its UI over HTTPS with a 200 response, Pgweb serves its UI, the application container is healthy and its `/shared/ping` endpoint responds, and the application root page is reachable over HTTPS through nginx. Each check SHALL report the name of the service it targets.

#### Scenario: Service down fails its own check clearly
- **WHEN** a specific service is unreachable or unhealthy
- **THEN** the check for that service fails with a message naming the service, while the remaining checks still report their own outcomes

### Requirement: Authenticated page checks via headless browser

The suite SHALL use a headless browser that accepts the self-signed certificates to authenticate through the mock OIDC flow and verify client-rendered content: the main page shows the assistant greeting, and the WhatsApp page renders a QR code region.

#### Scenario: Assistant greeting is rendered
- **WHEN** the browser is authenticated and opens the main page
- **THEN** the assistant greeting text is visible

#### Scenario: WhatsApp QR code region is rendered
- **WHEN** the browser opens the WhatsApp page
- **THEN** a QR code region is present

### Requirement: Test-mode stack configuration

The test stack SHALL run with self-signed certificates generated by a committed helper, a mock OIDC server as the identity provider on a remapped port, its own compose project name, and fixed non-secret test values (`ADMIN_EMAIL`, the database password, `SESSION_PASSWORD`, `APP_URL`, `CLIENT_ID`, `CLIENT_SECRET` and `LOGIN_ISSUER` pointing at the mock server). The only real secret is `AI_API_KEY`, which the application and the assistant both require at start-up.

#### Scenario: Authentication works without Entra
- **WHEN** a browser completes the OIDC flow against the mock server
- **THEN** the application establishes an authenticated session without contacting the real Entra identity provider

#### Scenario: The suite does not touch the deployment
- **WHEN** the smoke suite runs
- **THEN** it uses its own compose project name and remapped ports, so it does not collide with a running deployment

### Requirement: One aggregated merge check

The pipeline SHALL publish one aggregated job, "All Build Check Success", that depends on every lint, test, build and smoke job, and that job SHALL be the check required to merge a pull request.

#### Scenario: Aggregated check passes when all jobs pass
- **WHEN** every lint, test, build and smoke job passes
- **THEN** "All Build Check Success" passes and the pull request is mergeable

#### Scenario: Aggregated check blocks merge on any failure
- **WHEN** any lint, test, build or smoke job fails
- **THEN** "All Build Check Success" fails and the pull request is not mergeable

### Requirement: Deploy runs only on the main branch

The deploy job SHALL depend on the aggregated check, SHALL run only for a push to the main branch, SHALL be skipped for a Dependabot push, and SHALL synchronise the stack definition and the four images to the server, load the images, recreate the services and wait until they report running or healthy before pruning the previous images.

#### Scenario: Deploy publishes the stack
- **WHEN** the pipeline runs on the main branch with every check and the smoke suite green
- **THEN** the deploy synchronises the stack and the built images to the server, recreates the services and waits for them to report running or healthy

#### Scenario: A failing check blocks the deploy
- **WHEN** any check or the smoke suite fails on the main branch
- **THEN** the deploy does not run

#### Scenario: A dependabot push does not deploy
- **WHEN** the push was made by the dependency bot
- **THEN** the deploy job is skipped

### Requirement: The smoke suite runs locally against a locally built stack

The suite SHALL be runnable locally through the integration-test package against a stack the developer has built and brought up, using the committed test configuration and project name.

#### Scenario: Local run of the smoke suite
- **WHEN** a developer builds the images, brings the test stack up and runs the integration-test package
- **THEN** the suite runs its checks against that stack and reports pass or fail
