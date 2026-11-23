# Spec Delta

## REMOVED Requirements

### Requirement: Renovate keeps dependencies and Docker images up to date
**Reason**: Major `postgres` updates are no longer ignored, so the requirement is replaced by one without that exception.
**Migration**: See "Renovate opens pull requests for outdated dependencies and images"; major updates stay unmerged by the existing requirement "Patch and minor dependency updates merge automatically and stay current with main".

## ADDED Requirements

### Requirement: Renovate opens pull requests for outdated dependencies and images

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file daily and open one pull request per dependency update, only for versions at least one day old, including major versions. Dependabot SHALL NOT open version-update pull requests.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists in `services/web`, `services/wichteln`, `services/dev-machine` or `infrastructure/db-backup`
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
