# Spec Delta

## MODIFIED Requirements

### Requirement: Application images are supplied, never pulled

The web application, assistant, WhatsApp bridge, Wichteln and development-machine images SHALL be built by the pipeline and loaded onto the host under the `homeserver:<name>` names, and the stack SHALL NOT pull them from a registry. The backup service's image SHALL be built on the host instead, and the remaining services SHALL use published images.

#### Scenario: Stack uses the supplied images
- **WHEN** the stack starts the application services
- **THEN** it runs the locally loaded `homeserver:<name>` images of the deployed revision

#### Scenario: A missing image is not substituted
- **WHEN** one of the built images is missing on the host
- **THEN** the stack fails to start that service instead of pulling a published image

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the development home and the WhatsApp bridge data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host. The assistant's and Wichteln's data SHALL live in the shared production database rather than in dedicated volumes.

#### Scenario: Data survives a stack restart
- **WHEN** the stack is stopped and started again
- **THEN** the databases, the development home and the WhatsApp data are retained

#### Scenario: Assistant and Wichteln share the production database
- **WHEN** the assistant or Wichteln stores data
- **THEN** the data is written to the shared production database and no dedicated database or volume exists for them

## ADDED Requirements

### Requirement: Wichteln stores its data in the shared database under a prefix

The Wichteln app SHALL store its groups, participants, wishes and selections in the shared production database under `wichteln_`-prefixed tables, SHALL apply its own migration files at startup, and SHALL NOT use a dedicated database of its own.

#### Scenario: Wichteln keeps its data in the shared database under a prefix
- **WHEN** Wichteln stores a group, participant, wish or selection
- **THEN** the data is written to the shared database using `wichteln_`-prefixed tables, and no dedicated Wichteln database exists

#### Scenario: Wichteln waits for its database
- **WHEN** the Wichteln service starts
- **THEN** it starts only after the shared production database reports healthy
