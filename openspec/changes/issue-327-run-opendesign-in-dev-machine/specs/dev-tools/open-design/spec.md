## Purpose

Lets developers in the dev-machine create and edit the repo's design artifacts from the browser: OpenDesign runs inside the dev-machine as part of the dev stack, installed in the dev-machine image, and reachable at `https://dev.gutschi.site:8446` behind the dev basic auth. Opening the repo's `design/` folder as a project and selecting an agent runtime are one-time actions in the OpenDesign UI, not automated by this change.

## ADDED Requirements

### Requirement: Dev stack starts and keeps OpenDesign running
The dev stack SHALL start OpenDesign inside the dev-machine automatically whenever the dev-machine runs and SHALL restart it if it stops, without any manual or ad-hoc provisioning step per container start.

#### Scenario: OpenDesign starts with the dev-machine
- **WHEN** the dev-machine container starts with the dev stack
- **THEN** the OpenDesign daemon process is started automatically and answers its health endpoint

#### Scenario: OpenDesign restart after a stop
- **WHEN** the OpenDesign daemon process stops or exits unexpectedly while the dev-machine keeps running
- **THEN** the daemon is started again automatically

### Requirement: OpenDesign is installed in the dev-machine image
The dev-machine image SHALL contain an OpenDesign installation built at image build time from the pinned upstream release `open-design-v0.22.1` of `nexu-io/open-design` (source fetched and built during the image build), with a runnable `od` command on PATH. Runtime state SHALL be kept outside the image in a data directory that survives image rebuilds.

#### Scenario: Built image contains OpenDesign
- **WHEN** a dev-machine image is built
- **THEN** the image contains the `od` command, the installed daemon reports version `open-design-v0.22.1` (e.g. the daemon package manifest at `/opt/open-design/apps/daemon/package.json`, or `od version` against a running daemon), and no download or build of OpenDesign happens at container start

#### Scenario: Runtime data survives image rebuilds
- **WHEN** the dev-machine image is rebuilt and the container restarts against the same runtime data directory
- **THEN** OpenDesign state (projects and their tab state) is still present

### Requirement: Reachable on dev.gutschi.site:8446 behind dev basic auth
OpenDesign SHALL be reachable over TLS at `https://dev.gutschi.site:8446`. Requests without valid dev basic-auth credentials SHALL be denied; requests with valid dev basic-auth credentials SHALL be served the OpenDesign UI. OpenDesign SHALL be configured to accept unauthenticated API calls only from behind that authenticating reverse proxy.

#### Scenario: Unauthenticated access is denied
- **WHEN** a client requests `https://dev.gutschi.site:8446` without credentials
- **THEN** the request is denied (HTTP 401) and no OpenDesign UI is served

#### Scenario: Valid dev credentials are served
- **WHEN** a client requests `https://dev.gutschi.site:8446` with valid dev basic-auth credentials
- **THEN** the OpenDesign UI is served (HTTP 200)
