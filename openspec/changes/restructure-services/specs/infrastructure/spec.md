# Spec Delta

## REMOVED Requirements

### Requirement: Application images are supplied, never pulled

**Reason**: Application images are now published to GitHub Container Registry and pulled from there, instead of being built by the pipeline and loaded onto the host.
**Migration**: Publish each service's image to GHCR and pull it at deploy time; remove the `pull_policy: never` entries from the compose stack.

## MODIFIED Requirements

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the development home and the WhatsApp bridge data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host. The assistant's and Wichteln's data SHALL live in the shared production database rather than in dedicated volumes.

#### Scenario: Data survives a stack restart
- **WHEN** the stack is stopped and started again
- **THEN** the databases, the development home and the WhatsApp data are retained

#### Scenario: Assistant and Wichteln share the production database
- **WHEN** the assistant or Wichteln stores data
- **THEN** the data is written to the shared production database and no dedicated database or volume exists for them

## ADDED Requirements

### Requirement: Application images are pulled from GHCR

The web application, assistant, WhatsApp bridge, Wichteln and development-machine images SHALL be published to GitHub Container Registry as `ghcr.io/<owner>/homeserver-<name>:latest` and the stack SHALL pull them from the registry. The backup service's image SHALL be built on the host instead, and the remaining services SHALL use published images.

#### Scenario: Stack pulls the application images from GHCR
- **WHEN** the stack starts the application services
- **THEN** it pulls the `ghcr.io/<owner>/homeserver-<name>:latest` image for each service from GitHub Container Registry

#### Scenario: An unchanged service reuses its latest image
- **WHEN** a service's folder has not changed since its last publish
- **THEN** the stack pulls and runs that service's existing latest image rather than a freshly built one

### Requirement: Wichteln stores its data in the shared database under a prefix

The Wichteln app SHALL store its groups, participants, wishes and selections in the shared production database under `wichteln_`-prefixed tables, SHALL apply its own migration files at startup, and SHALL NOT use a dedicated database of its own.

#### Scenario: Wichteln keeps its data in the shared database under a prefix
- **WHEN** Wichteln stores a group, participant, wish or selection
- **THEN** the data is written to the shared database using `wichteln_`-prefixed tables, and no dedicated Wichteln database exists

#### Scenario: Wichteln waits for its database
- **WHEN** the Wichteln service starts
- **THEN** it starts only after the shared production database reports healthy
