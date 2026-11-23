# Spec Delta

## MODIFIED Requirements

### Requirement: Renovate opens pull requests for outdated dependencies and images

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file daily and open one pull request per dependency update, only for versions at least one day old, including major versions. Dependabot SHALL NOT open version-update pull requests.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists at the repository root, in `services/dev-machine` or in `services/backup`
- **THEN** Renovate checks its images

#### Scenario: Compose images are covered
- **WHEN** a newer version of a pinned image in `infrastructure/docker-compose.yml` is released
- **THEN** Renovate opens a pull request that changes the tag

#### Scenario: One pull request per dependency
- **WHEN** several dependencies have newer versions
- **THEN** each update has its own pull request

#### Scenario: PostgreSQL major upgrades are proposed
- **WHEN** a new major version of `postgres` is released
- **THEN** Renovate opens a pull request for it, which is not merged automatically

#### Scenario: A PostgreSQL major upgrade warns about the data migration
- **WHEN** Renovate opens the pull request for a new major version of `postgres`
- **THEN** its title starts with a warning that a data migration is required and its description starts with a warning not to merge before the migration and the upgrade of the backup image's PostgreSQL client are done

### Requirement: The pull request pipeline tests only changed services

For each of the web application, Wichteln and the backup reported as changed, the "Pull request" pipeline SHALL run that service's tests once change detection has finished. A service not reported as changed SHALL have its tests skipped. The development machine has no tests.

#### Scenario: A changed service is tested
- **WHEN** the web application is reported as changed
- **THEN** its unit, integration and Storybook test projects run

#### Scenario: The backup is tested
- **WHEN** the backup is reported as changed
- **THEN** its unit tests run

#### Scenario: An unchanged service is skipped
- **WHEN** Wichteln is not reported as changed
- **THEN** Wichteln's test job is skipped

#### Scenario: A failing test fails the pipeline
- **WHEN** a test job fails
- **THEN** the "Quality Gate" fails

### Requirement: The CI pipeline publishes every image

The "CI" pipeline SHALL build the web application, Wichteln, the backup and the development machine as `linux/amd64` images named `ghcr.io/<owner>/homeserver-<name>:latest`, the web application and Wichteln from one shared Dockerfile selected by service name and the backup and the development machine each from their own service's folder and Dockerfile, and SHALL publish all four to GitHub Container Registry, whether or not their service changed. It SHALL tag the web application and Wichteln images with the commit, branch, pipeline run and build time. It SHALL NOT lint, run tests or start the stack, since the "Pull request" pipeline did.

#### Scenario: Every image is published on a merge
- **WHEN** a pull request that only changed Wichteln is merged to main
- **THEN** the web application, Wichteln, backup and development machine images are built and published

#### Scenario: The application image carries its revision
- **WHEN** the web application or the Wichteln image is built
- **THEN** it records the commit, branch, pipeline run and build time that produced it

#### Scenario: Main does not repeat the pull request checks
- **WHEN** the "CI" pipeline runs
- **THEN** no lint, test, change guard or stack start job runs

### Requirement: The CI pipeline deploys the whole stack

After all four images were published, the "CI" pipeline SHALL synchronise the stack definition to the server, pull the images and recreate the whole stack once. It SHALL NOT deploy when an image build or publish failed or was cancelled. Concurrent deploys on the server SHALL be serialised. There SHALL be no per-service deploy.

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

The "Pull request" pipeline SHALL determine which of the web application, Wichteln, backup and development machine services and whether the infrastructure changed, comparing the pull request against its base branch. Its test jobs, its stack start and the image builds of its stack start SHALL act only on what this stage reports as changed. The "CI" pipeline SHALL NOT detect changes.

#### Scenario: A change inside a service folder
- **WHEN** the pull request changes files under `services/<name>/` only
- **THEN** only that service is reported as changed

#### Scenario: A change to shared workspace files
- **WHEN** the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, the shared lint and format configuration (`.oxlintrc.json`, `.oxfmtrc.json`) or the shared setup action changes
- **THEN** every service is reported as changed

#### Scenario: A change to the shared application Dockerfile
- **WHEN** the pull request changes the Dockerfile at the repository root
- **THEN** the web application and Wichteln are reported as changed, and the backup, the development machine and the infrastructure are not

#### Scenario: A change to the pipeline definition
- **WHEN** either pipeline's workflow, the scripts it runs or any of its actions changes
- **THEN** every service and the infrastructure are reported as changed

#### Scenario: A change to the stack definition
- **WHEN** files under `infrastructure/` change
- **THEN** the infrastructure is reported as changed, and a service only when its own files changed

#### Scenario: Nothing relevant changed
- **WHEN** the pull request changes only files outside services, infrastructure, shared workspace files, the shared application Dockerfile and the pipeline, for example only `openspec/`
- **THEN** no service and no infrastructure is reported as changed
