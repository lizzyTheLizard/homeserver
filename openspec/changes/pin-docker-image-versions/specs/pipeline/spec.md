## ADDED Requirements

### Requirement: Docker base images are pinned to exact versions

Every `FROM` instruction in the repository's Dockerfiles that loads an image from outside the repository SHALL use an exact version tag and never `latest`, a missing tag or a floating major tag. Stages that build on an earlier stage of the same Dockerfile are exempt.

#### Scenario: Base image is pinned
- **WHEN** a Dockerfile starts a stage from an external image such as `node` or `alpine`
- **THEN** the tag names an exact version

### Requirement: Dependabot keeps Docker images up to date

Dependabot SHALL check the Docker images referenced by every Dockerfile and by the docker-compose file weekly, like the other dependency ecosystems, and open pull requests for newer versions. Major-version updates of `postgres` SHALL be ignored because they need a data migration and must match the PostgreSQL client of the backup image.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists in `services/web`, `services/assistant`, `services/whatsapp`, `services/wichteln`, `services/dev-machine` or `infrastructure/db-backup`
- **THEN** Dependabot checks its images

#### Scenario: Compose images are covered
- **WHEN** a newer version of a pinned image in `infrastructure/docker-compose.yml` is released
- **THEN** Dependabot opens a pull request that changes the tag

#### Scenario: Image updates are merged like other updates
- **WHEN** Dependabot opens a patch or minor image update that passes the "Quality Gate"
- **THEN** the existing auto-merge workflow merges it like any other dependency update

#### Scenario: PostgreSQL major upgrades are not proposed
- **WHEN** a new major version of `postgres` is released
- **THEN** Dependabot does not open a pull request for it
