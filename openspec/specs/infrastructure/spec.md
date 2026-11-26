# infrastructure Specification

## Purpose

Defines the deployed infrastructure: the docker-compose stack that runs the production and development services, the reverse proxies and TLS termination that publish them, the authoritative DNS, and the backup and restore of the production database.

## Requirements

### Requirement: The stack runs as one docker-compose project

The deployment SHALL be a single docker-compose stack whose services share one network and address each other by service name. It SHALL publish only nginx (80, 443 and the internal UI ports 8443 and 8445), the name server (53 over TCP and UDP) and the development machine's SSH port (2222), and SHALL NOT publish the production or development database, nor the log viewer, database viewer, code server or Storybook.

#### Scenario: Services reach each other by name
- **WHEN** one service calls another
- **THEN** it uses the other service's name on the shared network

#### Scenario: Databases are not published
- **WHEN** the stack is running
- **THEN** neither the production nor the development database is reachable from outside the stack

#### Scenario: Internal UIs are reached through the proxy only
- **WHEN** a client tries to reach the log viewer, database viewer, code server or Storybook on its service port
- **THEN** it is unreachable, because only nginx publishes those ports

### Requirement: Services wait for the dependencies that must be healthy

The stack SHALL gate the reverse proxy on the application and the auth proxy being healthy and on the Wichteln service having started, and the application on the production database and the WAHA service being healthy; other dependencies SHALL only order the start. The auth proxy SHALL only be started after the log and database viewers, without waiting for them to report healthy.

#### Scenario: Proxy waits for the application
- **WHEN** the stack starts and the application is not yet healthy
- **THEN** the reverse proxy does not start serving until the application reports healthy

#### Scenario: Proxy can start once Wichteln exists
- **WHEN** the stack starts and the Wichteln service has started but is not yet healthy
- **THEN** the reverse proxy may start and answers Wichteln requests with a gateway error until the service is healthy

#### Scenario: Application waits for its dependencies
- **WHEN** the application starts
- **THEN** it starts only after the production database and the WAHA service are healthy

#### Scenario: Viewers are ordered but not awaited
- **WHEN** the log or database viewer fails to become healthy
- **THEN** the auth proxy still starts

### Requirement: Every long-running service reports its health

Each long-running service SHALL carry a healthcheck that probes it: the application its ping endpoint, the WAHA service its HTTP health probe, both databases their readiness, the reverse proxies their local health route and the backup service its scheduler process.

#### Scenario: An unhealthy service is reported
- **WHEN** a service's probe fails
- **THEN** the stack reports that service as unhealthy

#### Scenario: The stack waits for healthy services
- **WHEN** the stack is brought up in wait mode
- **THEN** it returns only once every healthchecked service reports healthy

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the development home and the WAHA session data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host. Wichteln's data and the web application's data SHALL live in the shared production database rather than in dedicated volumes.

#### Scenario: Data survives a stack restart
- **WHEN** the stack is stopped and started again
- **THEN** the databases, the development home and the WAHA sessions are retained

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
- **WHEN** a client requests the WAHA service (including its dashboard and API) through the public entrypoint
- **THEN** no route exists for it

### Requirement: The internal user interfaces are gated by basic auth

The log viewer and the database viewer SHALL require the administrative credential, and the code server and the Storybook SHALL require the development credential. The auth proxy SHALL hash the configured passwords itself at start-up and SHALL NOT have a credential compiled into its configuration.

#### Scenario: Logs and database viewers require the administrative credential
- **WHEN** a client opens the log viewer or the database viewer
- **THEN** the administrative credential is required

#### Scenario: Development interfaces require the development credential
- **WHEN** a client opens the code server or the Storybook
- **THEN** the development credential is required

#### Scenario: Credentials come from configuration
- **WHEN** the auth proxy starts
- **THEN** it derives its credentials from the configured administrative and development passwords

### Requirement: Certificates are issued and renewed automatically

A certificate service SHALL renew the stack's certificates every twelve hours and nginx SHALL reload its configuration every six hours so renewed certificates take effect without a manual restart.

#### Scenario: Renewed certificate is picked up
- **WHEN** the certificate service renews a certificate
- **THEN** the reverse proxy serves the renewed certificate without a manual restart

### Requirement: DNS is served authoritatively for the deployment's zone

The stack SHALL run an authoritative, non-recursive name server, from the Internet Systems Consortium's `bind9` image on the 9.20 release line, for the deployment's zone, whose address records point at the host address substituted at start-up. The zone file generated at start-up SHALL be readable by the name server process.

#### Scenario: Zone answers authoritatively
- **WHEN** a client queries a name in the deployment's zone
- **THEN** the name server answers authoritatively with the host's address

#### Scenario: Recursion is refused
- **WHEN** a client asks the name server to resolve a name outside its zone
- **THEN** the request is not resolved recursively

#### Scenario: The generated zone file is readable
- **WHEN** the name server container starts and generates the zone file from its template
- **THEN** the file is world-readable and the name server loads the zone without a permission error

### Requirement: The stack restarts its services automatically

Every long-running service SHALL restart automatically unless it was stopped deliberately, except the certificate service, which SHALL run only its periodic renewal loop and SHALL NOT be restarted.

#### Scenario: A crashed service is restarted
- **WHEN** a long-running service exits unexpectedly
- **THEN** the stack starts it again

#### Scenario: Certificate service does not restart on its own
- **WHEN** the certificate service's renewal process ends
- **THEN** it is not restarted automatically

### Requirement: The Wichteln app runs as its own internal service

The stack SHALL run the Wichteln app as its own service on the shared network and SHALL NOT publish the app outside the stack; it is reached only through the reverse proxy.

#### Scenario: App is internal

- **WHEN** the stack is running
- **THEN** the Wichteln app is reachable directly only from the stack's network, and from outside only through nginx

### Requirement: Application images are pulled from GHCR

The web application, Wichteln, backup and development-machine images SHALL be published to GitHub Container Registry as `ghcr.io/<owner>/homeserver-<name>:latest` and the stack SHALL pull them from the registry. No image SHALL be built on the host, and the remaining services, including WAHA (its upstream image), SHALL use published images.

#### Scenario: Stack pulls the application images from GHCR
- **WHEN** the stack starts the application services
- **THEN** it pulls the `ghcr.io/<owner>/homeserver-<name>:latest` image for each service from GitHub Container Registry

#### Scenario: An unchanged service reuses its latest image
- **WHEN** a service's folder has not changed since its last publish
- **THEN** the stack pulls and runs that service's existing latest image rather than a freshly built one

#### Scenario: The backup image is pulled
- **WHEN** the stack starts the backup service
- **THEN** it pulls `ghcr.io/<owner>/homeserver-backup:latest` and builds nothing on the host

### Requirement: Wichteln stores its data in the shared database under a prefix

The Wichteln app SHALL store its groups, participants, wishes and selections in the shared production database under `wichteln_`-prefixed tables, SHALL apply its own migration files at startup, and SHALL NOT use a dedicated database of its own.

#### Scenario: Wichteln keeps its data in the shared database under a prefix
- **WHEN** Wichteln stores a group, participant, wish or selection
- **THEN** the data is written to the shared database using `wichteln_`-prefixed tables, and no dedicated Wichteln database exists

#### Scenario: Wichteln waits for its database
- **WHEN** the Wichteln service starts
- **THEN** it starts only after the shared production database reports healthy

### Requirement: An infrastructure deploy recreates the whole stack

An infrastructure deploy SHALL force-recreate every service of the stack, including services whose definition did not change, and SHALL remove orphan containers of the stack, meaning containers whose service is no longer defined. The pipeline SHALL run it on the main branch whenever it reports the infrastructure as changed, after every changed service's image was published, and it SHALL replace that run's per-service deploys.

#### Scenario: Unchanged services are recreated
- **WHEN** an infrastructure deploy runs
- **THEN** every service of the stack is recreated, even when its configuration and image did not change

#### Scenario: Orphan containers are removed
- **WHEN** an infrastructure deploy runs and a container belongs to a service no longer defined in the stack
- **THEN** that container is removed

#### Scenario: A change to the deploy definition triggers a deploy
- **WHEN** a push to the main branch changes only the pipeline's workflow or one of its actions
- **THEN** an infrastructure deploy runs

#### Scenario: A change to the stack definition triggers a deploy
- **WHEN** a push to the main branch changes the stack definition or its mounted configuration
- **THEN** an infrastructure deploy runs

#### Scenario: New images are deployed with the stack
- **WHEN** a push to the main branch changes both the stack definition and the web application
- **THEN** the web application image is published first and the infrastructure deploy then recreates the whole stack with it, without a separate web deploy

### Requirement: External images in the stack are pinned to exact versions

Every image of the docker-compose stack that is not built from this repository SHALL be referenced with an exact version tag and never with `latest`, a missing tag or a floating major or minor tag. The only exception is the name server image, which SHALL be referenced with the `9.20` release-line tag because the publisher offers no finer pinned tag for it. Images built from this repository SHALL be referenced with `latest`.

#### Scenario: Third-party image is pinned
- **WHEN** the compose file references an image that is not published from this repository, such as the proxies, databases, viewers or certificate client
- **THEN** its tag names an exact version

#### Scenario: Name server follows its release line
- **WHEN** the compose file references the name server image
- **THEN** its tag is `9.20`

#### Scenario: Own image follows the latest build
- **WHEN** the compose file references an image published as `ghcr.io/lizzythelizard/homeserver-*`
- **THEN** its tag is `latest`

### Requirement: The web application is configured for the assistant's external services

The web application's container SHALL receive the language-model key, the Microsoft Graph application credentials and the WAHA address and API key, and SHALL NOT need any other service to run the assistant, Microsoft or WhatsApp features.

#### Scenario: No assistant container exists
- **WHEN** the stack is running
- **THEN** no assistant service is defined, and the Microsoft, WhatsApp and chat features work with the web application alone plus WAHA and the database

#### Scenario: Missing configuration fails fast
- **WHEN** the web application starts in production without a required key or credential
- **THEN** it reports the missing variable instead of starting with a default

