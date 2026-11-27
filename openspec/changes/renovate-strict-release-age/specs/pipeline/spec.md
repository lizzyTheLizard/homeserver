## MODIFIED Requirements

### Requirement: Renovate opens pull requests for outdated dependencies and images

Renovate SHALL check the npm/pnpm packages, the GitHub Actions and the Docker images referenced by every Dockerfile and by the docker-compose file daily and open one pull request per dependency update, only for versions at least one day old, including major versions. A pull request SHALL be opened as soon as its version is old enough and SHALL NOT wait for a status check that can only run once the pull request exists. Dependabot SHALL NOT open version-update pull requests.

#### Scenario: Every Dockerfile is covered
- **WHEN** a Dockerfile exists in `services/web`, `services/wichteln`, `services/dev-machine` or `services/backup`
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

#### Scenario: An old enough update gets its pull request without waiting
- **WHEN** a release is at least one day old and merges to main keep happening
- **THEN** the pull request for it is opened in the next Renovate run without anyone selecting it in the dependency dashboard

#### Scenario: A too young release gets no pull request
- **WHEN** a release is less than one day old
- **THEN** no pull request is opened for it until it is one day old

### Requirement: Updates waiting for their minimum age do not block other updates

Updates whose release is not yet old enough SHALL NOT use up the limit of open pull requests or of branches, so other updates are still proposed. The number of open pull requests SHALL stay limited.

#### Scenario: Many updates wait for their minimum age
- **WHEN** more updates are waiting for their minimum release age than the limit of open pull requests allows
- **THEN** further updates are still proposed and are not held back as rate-limited

#### Scenario: Open pull requests stay limited
- **WHEN** more updates are ready than the limit of open pull requests allows
- **THEN** only that many pull requests are open at once and the rest follow as they merge
