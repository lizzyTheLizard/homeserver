# Spec Delta

## ADDED Requirements

### Requirement: The Wichteln app runs as its own service with its own database

The stack SHALL run the Wichteln app as its own service on the shared network, backed by a dedicated PostgreSQL service, database and named volume that are separate from the homeserver database, and SHALL NOT publish the app or its database outside the stack.

#### Scenario: Wichteln keeps its data in its own database

- **WHEN** Wichteln stores a group, participant, wish or selection
- **THEN** the data is written to the Wichteln database and the homeserver database is untouched

#### Scenario: App and database are internal

- **WHEN** the stack is running
- **THEN** the Wichteln app and its database are reachable only from the stack's network

#### Scenario: Wichteln waits for its database

- **WHEN** the Wichteln service starts
- **THEN** it starts only after its database reports healthy

## MODIFIED Requirements

### Requirement: Services start once their dependencies are healthy

The stack SHALL gate a service's start on the health of the services it depends on, so that the reverse proxy starts only after the application, the assistant and the auth proxy are healthy and the Wichteln service has started, the application starts only after the production database, the assistant and the WhatsApp bridge are healthy, and the Wichteln service starts only after its database is healthy.

#### Scenario: Proxy waits for the application

- **WHEN** the stack starts and the application is not yet healthy
- **THEN** the reverse proxy does not start serving until the application reports healthy

#### Scenario: Proxy can start once Wichteln exists

- **WHEN** the stack starts and the Wichteln service has started but is not yet healthy
- **THEN** the reverse proxy may start and answers Wichteln requests with a gateway error until the service is healthy

#### Scenario: Application waits for its dependencies

- **WHEN** the application starts
- **THEN** it starts only after the production database, the assistant and the WhatsApp bridge are healthy

#### Scenario: Wichteln waits for its database

- **WHEN** the Wichteln service starts
- **THEN** it starts only after its database reports healthy

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the Wichteln database, the development home and the WhatsApp bridge data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host.

#### Scenario: Data survives a stack restart

- **WHEN** the stack is stopped and started again
- **THEN** the databases, including the Wichteln database, the development home and the WhatsApp data are retained

### Requirement: Application images are supplied, never pulled

The application, assistant, WhatsApp bridge, Wichteln and development-machine images SHALL be built by the pipeline and loaded onto the host, and the stack SHALL NOT pull them from a registry.

#### Scenario: Stack uses the supplied images

- **WHEN** the stack starts the application services
- **THEN** it runs the locally loaded images of the deployed revision

### Requirement: nginx terminates TLS and routes the public hostnames

nginx SHALL be the public entrypoint, SHALL serve the ACME challenge and a health endpoint over plain HTTP and redirect everything else to HTTPS, and SHALL route each public hostname and port to its service, including the assistant WebSocket endpoint and the Wichteln app.

#### Scenario: Plain HTTP is redirected

- **WHEN** a request arrives over plain HTTP that is not an ACME challenge or the health endpoint
- **THEN** it is redirected to HTTPS

#### Scenario: ACME challenge is served

- **WHEN** the certificate authority requests an ACME challenge over plain HTTP
- **THEN** nginx serves the challenge from the shared webroot

#### Scenario: Public hostname reaches its service

- **WHEN** a request arrives for one of the published hostnames
- **THEN** nginx forwards it to that hostname's service

#### Scenario: Wichteln hostname reaches the Wichteln service

- **WHEN** a request arrives for the Wichteln hostname over HTTPS
- **THEN** nginx terminates TLS with the Wichteln certificate and forwards the request to the Wichteln service

#### Scenario: Assistant WebSocket is proxied

- **WHEN** a client connects to the assistant WebSocket endpoint
- **THEN** nginx upgrades and forwards the connection to the assistant service
