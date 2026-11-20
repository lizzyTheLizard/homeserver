## MODIFIED Requirements

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
- **WHEN** a dependency update pull request is merged automatically after its "Quality Gate" passed
- **THEN** the pipeline runs on main for the merge commit and deploys the changed services

## ADDED Requirements

### Requirement: Renovate keeps dependencies and Docker images up to date

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file weekly and open one pull request per dependency update, only for versions at least one day old. Major-version updates of `postgres` SHALL be ignored because they need a data migration and must match the PostgreSQL client of the backup image. Dependabot SHALL NOT open version-update pull requests.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists in `services/web`, `services/assistant`, `services/whatsapp`, `services/wichteln`, `services/dev-machine` or `infrastructure/db-backup`
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

Renovate pull requests for patch and minor updates SHALL be merged automatically once the required "Quality Gate" passed, while the main branch keeps requiring pull requests to be up to date with main. Renovate SHALL bring a pull request that is behind main up to date by rebasing it, and SHALL rebase one that conflicts with main, so that every such pull request eventually merges without manual action regardless of how many are open. Major updates SHALL NOT be merged automatically. No workflow of this repository SHALL push to a Renovate branch.

#### Scenario: Several updates are open
- **WHEN** several patch or minor update pull requests are open and one of them merges
- **THEN** the others are rebased onto the new main, run the pipeline again and merge once it passed

#### Scenario: An update conflicts with main
- **WHEN** a merge to main leaves another update pull request with a merge conflict
- **THEN** Renovate rebases it, the pipeline runs again and it merges after a passed "Quality Gate"

#### Scenario: Major updates stay manual
- **WHEN** Renovate opens a major update
- **THEN** it is not merged automatically

#### Scenario: A failing update does not merge
- **WHEN** the "Quality Gate" of an update pull request fails
- **THEN** it is not merged and stays open

## REMOVED Requirements

### Requirement: Dependabot keeps Docker images up to date
**Reason**: Replaced by the Renovate requirement, which covers all dependency types.
**Migration**: Delete `.github/dependabot.yml` and add `.github/renovate.json5`.

### Requirement: Dependabot pull requests with armed auto-merge are kept up to date
**Reason**: Renovate rebases its own pull requests; the workflow's commits stopped Dependabot from rebasing.
**Migration**: Delete `.github/workflows/dependabot-update-branch.yml` and `.github/workflows/dependabot-auto-merge.yml`.
