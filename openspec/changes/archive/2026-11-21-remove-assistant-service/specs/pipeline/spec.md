# Spec Delta

## MODIFIED Requirements

### Requirement: The pipeline first detects what changed

The pipeline SHALL start by determining which of the web application, WhatsApp bridge, Wichteln and development machine services and whether the infrastructure changed, comparing a pull request against its base branch and a push to main against the previous main commit. All later stages SHALL act only on what this stage reports as changed.

#### Scenario: A change inside a service folder
- **WHEN** the compared commits change files under `services/<name>/` only
- **THEN** only that service is reported as changed

#### Scenario: A change to shared workspace files
- **WHEN** the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, the shared lint and format configuration (`.oxlintrc.json`, `.oxfmtrc.json`) or the shared setup action changes
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
- **WHEN** the WhatsApp bridge is not reported as changed
- **THEN** the bridge's lint, test and build jobs are skipped

#### Scenario: A pull request builds without publishing
- **WHEN** the pipeline runs for a pull request
- **THEN** the changed services' images are built but not published to the registry

### Requirement: Each changed service's image is published from main

The pipeline SHALL build the web application, WhatsApp bridge, Wichteln and development machine as `linux/amd64` images named `ghcr.io/<owner>/homeserver-<name>:latest`, each from its own service's folder and Dockerfile, SHALL tag the web application image with the commit, branch, pipeline run and build time, and SHALL publish an image to GitHub Container Registry only on the main branch, only when its service changed and only after its lint and tests passed.

#### Scenario: A changed service's image is published on main
- **WHEN** the pipeline runs on main and the WhatsApp bridge is reported as changed and its lint and tests pass
- **THEN** `ghcr.io/<owner>/homeserver-whatsapp:latest` is built from `services/whatsapp/` and published

#### Scenario: A failing check blocks publishing
- **WHEN** a changed service's lint or tests fail
- **THEN** its image is not published

#### Scenario: The application image carries its revision
- **WHEN** the web application image is built
- **THEN** it records the commit, branch, pipeline run and build time that produced it

### Requirement: Changed services are deployed from main

The deploy SHALL run only for a run on the main branch, regardless of who started it, and only after the deployed service's lint, tests and image publish succeeded. A service that has no lint or test task, such as the development machine, SHALL be deployed once its image publish succeeded; its missing lint or test SHALL NOT block the deploy. For each changed service it SHALL synchronise the stack definition to the server, pull that service's published image and recreate only that service. Concurrent deploys on the server SHALL be serialised.

#### Scenario: Deploy publishes the stack
- **WHEN** the pipeline runs on main, the WhatsApp bridge is reported as changed and its image was published
- **THEN** the stack definition is synchronised to the server and the bridge's container is recreated from the new image

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

The pipeline SHALL be able to lint every package and SHALL run the web application's three test projects, the WhatsApp bridge's tests and Wichteln's tests, each only when its service is reported as changed. A failing job SHALL stop the jobs that depend on it.

#### Scenario: All checks run
- **WHEN** every service is reported as changed
- **THEN** the lint and test jobs of every service and the four image builds run

#### Scenario: A failing check stops its dependants
- **WHEN** any lint, test or build job fails
- **THEN** the publish and deploy of that service do not run

### Requirement: All packages are linted with one shared configuration

The web application, WhatsApp bridge and Wichteln SHALL be linted against a single lint configuration at the repository root, and no package SHALL carry its own lint configuration file.

#### Scenario: Every package uses the same rules
- **WHEN** any package is linted
- **THEN** the shared root configuration applies, including its performance, style and curated restriction rules

#### Scenario: The shared configuration is a shared workspace file
- **WHEN** the shared lint or format configuration changes
- **THEN** every service is linted and tested

### Requirement: Renovate keeps dependencies and Docker images up to date

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file daily (before 6 a.m. Zurich time) and open one pull request per dependency update, only for versions at least one day old. Major-version updates of `postgres` SHALL be ignored because they need a data migration and must match the PostgreSQL client of the backup image. Dependabot SHALL NOT open version-update pull requests.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists in `services/web`, `services/whatsapp`, `services/wichteln`, `services/dev-machine` or `infrastructure/db-backup`
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

