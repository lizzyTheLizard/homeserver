## Purpose

Lets developers in the dev-machine create and edit the repo's design artifacts from the browser: OpenDesign runs inside the dev-machine as part of the dev stack, installed in the dev-machine image, reachable at `https://dev.gutschi.site:8446` behind the dev basic auth, and already opened on the repo's `design/` folder with the configured DeepSeek Harness runtime available.

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
- **THEN** the image contains the `od` command reporting version `open-design-v0.22.1` and no download or build of OpenDesign happens at container start

#### Scenario: Runtime data survives image rebuilds
- **WHEN** the dev-machine image is rebuilt and the container restarts against the same runtime data directory
- **THEN** OpenDesign state (imported projects and their tab state) is still present

### Requirement: Reachable on dev.gutschi.site:8446 behind dev basic auth
OpenDesign SHALL be reachable over TLS at `https://dev.gutschi.site:8446`. Requests without valid dev basic-auth credentials SHALL be denied; requests with valid dev basic-auth credentials SHALL be served the OpenDesign UI. OpenDesign SHALL be configured to accept unauthenticated API calls only from behind that authenticating reverse proxy.

#### Scenario: Unauthenticated access is denied
- **WHEN** a client requests `https://dev.gutschi.site:8446` without credentials
- **THEN** the request is denied (HTTP 401) and no OpenDesign UI is served

#### Scenario: Valid dev credentials are served
- **WHEN** a client requests `https://dev.gutschi.site:8446` with valid dev basic-auth credentials
- **THEN** the OpenDesign UI is served (HTTP 200)

### Requirement: Opened on the repo design folder
OpenDesign SHALL have the repo's `design/` folder (at `/home/dev/workspace/design` inside the dev-machine) as its project. The binding SHALL be established automatically at startup and SHALL be idempotent across restarts: repeated boots SHALL NOT create duplicate projects for the same folder. Artifacts created or edited in OpenDesign SHALL be written in place into that folder, so they appear in the repo.

#### Scenario: First boot binds the design folder
- **WHEN** the daemon starts and no project is bound to `/home/dev/workspace/design` yet
- **THEN** exactly one project bound to that folder is created automatically and the UI opens on it

#### Scenario: Subsequent boots reuse the existing binding
- **WHEN** the daemon restarts and a project bound to `/home/dev/workspace/design` already exists
- **THEN** no duplicate project is created and the existing binding is used

#### Scenario: Artifacts land in the repo folder
- **WHEN** an artifact is created or edited in OpenDesign for the `design/` project
- **THEN** the artifact is written into `/home/dev/workspace/design` inside the repo

### Requirement: DeepSeek Harness runtime wired without new credentials
OpenDesign SHALL offer DeepSeek Harness as an agent runtime, driven through the `dsh` CLI that is part of the dev image and reusing that installation's existing model configuration. Wiring the runtime SHALL be automatic and idempotent at startup, SHALL NOT require adding any API key to the dev-machine environment, and a wiring failure SHALL NOT prevent OpenDesign from serving.

#### Scenario: Runtime wired at startup
- **WHEN** the OpenDesign daemon is healthy at startup and the `dsh` CLI is installed
- **THEN** the DeepSeek Harness runtime is set up for OpenDesign (idempotently) using dsh's existing model configuration

#### Scenario: Wiring failure does not break serving
- **WHEN** wiring the DeepSeek Harness runtime fails while the daemon is starting
- **THEN** OpenDesign still serves its UI and the failure is logged without taking the daemon down
