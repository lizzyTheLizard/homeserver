## ADDED Requirements

### Requirement: Tool versions pinned in Dockerfiles are kept current by Renovate

Tools that a Dockerfile installs from outside its base image or a package manager manifest, such as command-line tools downloaded as release archives or installed globally with npm, SHALL be pinned to an exact version in the Dockerfile in a way Renovate recognizes, so that Renovate opens a pull request when a newer version is released.

#### Scenario: A pinned tool version is outdated
- **WHEN** a newer release of a tool pinned in a Dockerfile, such as GitHub CLI or code-server, is published
- **THEN** Renovate opens a pull request that changes the pinned version

#### Scenario: No tool follows a floating version
- **WHEN** a Dockerfile installs a tool
- **THEN** it installs an exact version and not `latest`
