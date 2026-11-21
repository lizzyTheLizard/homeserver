# Spec Delta

## MODIFIED Requirements

### Requirement: Services wait for the dependencies that must be healthy

The stack SHALL gate the reverse proxy on the application and the auth proxy being healthy and on the Wichteln service having started, and the application on the production database and the WhatsApp bridge being healthy; other dependencies SHALL only order the start. The auth proxy SHALL only be started after the log and database viewers, without waiting for them to report healthy.

#### Scenario: Proxy waits for the application
- **WHEN** the stack starts and the application is not yet healthy
- **THEN** the reverse proxy does not start serving until the application reports healthy

#### Scenario: Proxy can start once Wichteln exists
- **WHEN** the stack starts and the Wichteln service has started but is not yet healthy
- **THEN** the reverse proxy may start and answers Wichteln requests with a gateway error until the service is healthy

#### Scenario: Application waits for its dependencies
- **WHEN** the application starts
- **THEN** it starts only after the production database and the WhatsApp bridge are healthy

#### Scenario: Viewers are ordered but not awaited
- **WHEN** the log or database viewer fails to become healthy
- **THEN** the auth proxy still starts

### Requirement: Every long-running service reports its health

Each long-running service SHALL carry a healthcheck that probes it: the application its ping endpoint, the WhatsApp bridge its health endpoint, both databases their readiness, the reverse proxies their local health route and the backup service its scheduler process.

#### Scenario: An unhealthy service is reported
- **WHEN** a service's probe fails
- **THEN** the stack reports that service as unhealthy

#### Scenario: The stack waits for healthy services
- **WHEN** the stack is brought up in wait mode
- **THEN** it returns only once every healthchecked service reports healthy

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the development home and the WhatsApp bridge data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host. Wichteln's data and the web application's data SHALL live in the shared production database rather than in dedicated volumes.

#### Scenario: Data survives a stack restart
- **WHEN** the stack is stopped and started again
- **THEN** the databases, the development home and the WhatsApp data are retained

#### Scenario: Assistant and Wichteln share the production database
- **WHEN** the web application or Wichteln stores data
- **THEN** the data is written to the shared production database and no dedicated database or volume exists for them

### Requirement: nginx terminates TLS and routes the public hostnames

nginx SHALL be the public entrypoint, SHALL serve the ACME challenge and a health endpoint answering `ok` over plain HTTP and redirect everything else to HTTPS, and SHALL route each public hostname and port to its service, including the streamed chat answers of the web application and the Wichteln app.

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
- **WHEN** a client calls the web application's chat endpoint
- **THEN** nginx forwards it, streams the response without buffering when the application asks for it, and waits long enough for a slow streamed answer

#### Scenario: The internal APIs stay internal
- **WHEN** a client requests the WhatsApp bridge through the public entrypoint
- **THEN** no route exists for it

### Requirement: Application images are pulled from GHCR

The web application, WhatsApp bridge, Wichteln and development-machine images SHALL be published to GitHub Container Registry as `ghcr.io/<owner>/homeserver-<name>:latest` and the stack SHALL pull them from the registry. The backup service's image SHALL be built on the host instead, and the remaining services SHALL use published images.

#### Scenario: Stack pulls the application images from GHCR
- **WHEN** the stack starts the application services
- **THEN** it pulls the `ghcr.io/<owner>/homeserver-<name>:latest` image for each service from GitHub Container Registry

#### Scenario: An unchanged service reuses its latest image
- **WHEN** a service's folder has not changed since its last publish
- **THEN** the stack pulls and runs that service's existing latest image rather than a freshly built one

## ADDED Requirements

### Requirement: The web application is configured for the assistant's external services

The web application's container SHALL receive the language-model key, the Microsoft Graph application credentials and the WhatsApp bridge address, and SHALL NOT need any other service to run the assistant, Microsoft or WhatsApp features.

#### Scenario: No assistant container exists
- **WHEN** the stack is running
- **THEN** no assistant service is defined, and the Microsoft, WhatsApp and chat features work with the web application alone plus the bridge and database

#### Scenario: Missing configuration fails fast
- **WHEN** the web application starts in production without a required key or credential
- **THEN** it reports the missing variable instead of starting with a default
