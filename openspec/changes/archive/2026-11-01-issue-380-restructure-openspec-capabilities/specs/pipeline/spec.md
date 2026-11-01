# Spec Delta

## Purpose

Defines the continuous-integration and test work: the GitHub pipelines that lint, test, build and deploy the stack, the test suites that run locally and in CI, and the Docker image builds that feed the smoke suite and the deployment.

## ADDED Requirements

### Requirement: The pipeline runs the checks in order on every push

The pipeline SHALL run linting, the test suites and the Docker image builds for the application, the assistant, the WhatsApp bridge and the development machine, and SHALL run the deploy only after those checks and the stack smoke suite have passed.

#### Scenario: Checks run before deploy
- **WHEN** a push reaches the pipeline
- **THEN** linting, the test suites and the image builds run, and the deploy does not start before they and the smoke suite pass

#### Scenario: A failing check stops the run
- **WHEN** linting, testing, an image build or the smoke suite fails
- **THEN** the dependent jobs, including the deploy, do not run

#### Scenario: Deploy publishes the stack
- **WHEN** the pipeline runs on the main branch with every check and the smoke suite green
- **THEN** the deploy synchronises the stack and the built images to the server, recreates the services and waits for them to report running or healthy

### Requirement: The test suites run as parallel projects

The test suite SHALL consist of three projects that run in parallel: a unit project for the fast tests, an integration project for the server actions and a Storybook project for the component interaction tests.

#### Scenario: Unit project runs the fast tests
- **WHEN** the unit project runs
- **THEN** it executes the unit test files and excludes the server tests

#### Scenario: Integration project runs the server tests
- **WHEN** the integration project runs
- **THEN** it executes the integration test file that sits beside each server action

#### Scenario: Storybook project runs the interaction tests
- **WHEN** the Storybook project runs
- **THEN** it executes the component stories' interaction tests in a browser

### Requirement: Integration tests run against an in-memory database with the migrations

The integration tests SHALL run against an in-memory database that has been seeded with all of the project's migrations, so the tests exercise the real schema without touching a shared database.

#### Scenario: Integration test uses the real schema
- **WHEN** an integration test runs
- **THEN** it runs against an in-memory database carrying the project's migrations

### Requirement: Storybook interaction tests need a browser

The Storybook project SHALL run its interaction tests in a Chromium browser, and a machine that is to run it SHALL have that browser's binary installed.

#### Scenario: Missing browser blocks the Storybook project
- **WHEN** the Storybook project runs on a machine without the browser binary
- **THEN** the interaction tests cannot run until the browser is installed

### Requirement: Linting can fix locally and only reports in CI

The linting task SHALL apply fixes when run locally and SHALL only report problems without changing files when run for CI.

#### Scenario: Local lint fixes files
- **WHEN** the linting task runs locally
- **THEN** it applies the available fixes

#### Scenario: CI lint does not change files
- **WHEN** the linting task runs for CI
- **THEN** it reports problems without modifying files

### Requirement: Cached image builds

The CI image builds SHALL cache each build stage's output so that a push with no change to a service's dependency manifests reuses previously installed dependencies instead of re-installing them, and no change to the sources reuses the previously built output instead of rebuilding it.

#### Scenario: No source change reuses cached build
- **WHEN** a push reaches an image build with no change to that service's sources or dependency manifests since the last build that populated the cache
- **THEN** the build reuses the cached dependency install and cached build output without re-running them

#### Scenario: Source change rebuilds only what changed
- **WHEN** a push changes a service's sources but not its dependency manifests
- **THEN** the dependency install is reused from cache and only the build of the changed sources runs

### Requirement: Cache export does not dominate the build

The CI image builds SHALL export only the cache layers needed for the next build rather than every intermediate stage, so the cache export is not the largest line item in each build job.

#### Scenario: Cache export is bounded
- **WHEN** an image build runs
- **THEN** the time spent exporting cache is below the time spent performing the actual dependency install and build

### Requirement: Production-runnable images are preserved

The CI image builds SHALL continue to produce valid, production-runnable `homeserver:latest`, `homeserver-assistant:latest`, and `whatsapp-bridge:latest` images that the smoke suite and deploy jobs load and run exactly as before.

#### Scenario: Images load and run unchanged
- **WHEN** the image builds complete
- **THEN** the exported images start their services and serve traffic, and the smoke suite and deploy jobs function identically to before the caching and output changes

### Requirement: Smoke suite runs before deploy on every push

The pipeline SHALL build the application, WhatsApp bridge, assistant, and development-machine images on every push. The pipeline SHALL run a stack smoke suite that depends on those four build jobs, and the deploy job SHALL depend on the smoke suite, so the suite passes before the deploy step starts.

#### Scenario: Broken build blocked before deploy
- **WHEN** a push builds all images but the stack smoke suite fails
- **THEN** the deploy job does not start and the workflow run reports failure

#### Scenario: Green run deploys
- **WHEN** all build jobs and the stack smoke suite pass on the main branch
- **THEN** the deploy job runs

#### Scenario: Smoke suite tests the built images
- **WHEN** the smoke suite job starts
- **THEN** it downloads and loads the image artifacts produced by the build jobs and boots the stack with exactly those images, without rebuilding them

### Requirement: Single required merge check

The workflow SHALL expose one aggregated job, "All Build Check Success", that depends on every testing, linting, and building job in the pipeline, including the stack smoke suite. This aggregated job SHALL be the only status check required to merge a pull request.

#### Scenario: Aggregated check passes when all jobs pass
- **WHEN** every testing, linting, and building job (including the smoke suite) passes
- **THEN** "All Build Check Success" passes and the pull request is mergeable

#### Scenario: Aggregated check blocks merge on any failure
- **WHEN** any testing, linting, or building job (including the smoke suite) fails
- **THEN** "All Build Check Success" fails and the pull request is not mergeable

### Requirement: Documented local run

The suite SHALL run locally through the documented step sequence and require only the optional `AI_API_KEY` — no Entra credentials and no other secrets. The stack images are built locally first, certificates are generated, the stack is brought up, the checks run, and the stack is torn down.

#### Scenario: Local run with only AI_API_KEY
- **WHEN** a developer follows the documented steps (certs, hosts entries, `infrastructure/.env`, compose up, `pnpm test`, compose down) with only `AI_API_KEY` available
- **THEN** the full stack boots, all checks run, and pass or fail is reported

### Requirement: Pipeline lifecycle

The CI pipeline SHALL bring the stack up (`docker compose up --wait`, covering healthchecked services), then run the checks — which poll the services without healthchecks themselves — and SHALL tear the stack down after the run, including when checks fail, leaving no orphan containers.

#### Scenario: Clean teardown on failure
- **WHEN** one or more checks fail
- **THEN** the stack is still torn down and no orphan containers remain

### Requirement: Infrastructure service checks

The suite SHALL assert that SSH on port 2222 accepts TCP connections, bind9 answers DNS queries, Dozzle serves its UI over HTTPS with a 200 response, Pgweb serves its UI, the application container is healthy and its `/shared/ping` endpoint responds, and the application root page is reachable over HTTPS through nginx. Each check SHALL report the name of the service it targets.

#### Scenario: Service down fails its own check clearly
- **WHEN** a specific service is unreachable or unhealthy
- **THEN** the check for that service fails with a message naming the service, while the remaining checks still report their own outcomes

### Requirement: Authenticated page checks via headless browser

The suite SHALL use a headless browser that accepts the self-signed certificates to authenticate through the mock OIDC flow and verify client-rendered content: the main page shows the assistant greeting with the assistant exercised using `AI_API_KEY`, and the WhatsApp page renders a QR code region.

#### Scenario: Assistant greeting is rendered
- **WHEN** the browser is authenticated and opens the main page
- **THEN** the assistant greeting text is visible

#### Scenario: WhatsApp QR code region is rendered
- **WHEN** the browser opens the WhatsApp page
- **THEN** a QR code region is present

### Requirement: Test-mode stack configuration

The test stack SHALL run with self-signed certificates generated by a committed helper, a mock OIDC server as the identity provider, and fixed non-secret test values (`ADMIN_EMAIL`, the database password, `SESSION_PASSWORD`, `APP_URL`, `CLIENT_ID` and `CLIENT_SECRET`, and `LOGIN_ISSUER` pointing at the mock server). The only real secret is `AI_API_KEY`, which is passed to the assistant service.

#### Scenario: Authentication works without Entra
- **WHEN** a browser completes the OIDC flow against the mock server
- **THEN** the application establishes an authenticated session without contacting the real Entra identity provider
