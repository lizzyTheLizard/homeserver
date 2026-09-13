## ADDED Requirements

### Requirement: OpenDesign verified end to end
The suite SHALL verify OpenDesign through nginx and caddy at `https://127.0.0.1:8446`: an unauthenticated request SHALL be denied (HTTP 401) and a request authenticated with the valid dev credentials (`DEV_USERNAME`/`DEV_PASSWORD` from the test environment) SHALL be served (HTTP 200). The check SHALL report OpenDesign as the service under test.

#### Scenario: Unauthenticated access is denied
- **WHEN** the suite requests the OpenDesign URL without credentials
- **THEN** the response is HTTP 401

#### Scenario: Valid dev credentials are served
- **WHEN** the suite requests the OpenDesign URL with the valid dev credentials
- **THEN** the response is HTTP 200

#### Scenario: OpenDesign down fails its own check
- **WHEN** OpenDesign inside dev-machine is unreachable through nginx and caddy
- **THEN** the OpenDesign check fails naming OpenDesign, while the remaining checks still report their own outcomes

### Requirement: OpenDesign project folder present in the smoke dev-machine
The smoke test stack SHALL make the checked-out `design/` folder available inside the dev-machine at `/home/dev/workspace/design`, because CI boots the dev-machine with `SKIP_GITHUB_BOOTSTRAP=1` and therefore has no repository clone in the dev-machine.

#### Scenario: CI smoke run provides the project folder
- **WHEN** the smoke stack starts the dev-machine in CI without a repository clone
- **THEN** `/home/dev/workspace/design` exists inside the dev-machine, backed by the checked-out `design/` folder
