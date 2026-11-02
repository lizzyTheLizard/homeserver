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

The stack SHALL gate the reverse proxy on the application, the assistant and the auth proxy being healthy and on the Wichteln service having started, and the application on the production database, the assistant and the WhatsApp bridge being healthy; other dependencies SHALL only order the start. The auth proxy SHALL only be started after the log and database viewers, without waiting for them to report healthy.

#### Scenario: Proxy waits for the application
- **WHEN** the stack starts and the application is not yet healthy
- **THEN** the reverse proxy does not start serving until the application reports healthy

#### Scenario: Proxy can start once Wichteln exists
- **WHEN** the stack starts and the Wichteln service has started but is not yet healthy
- **THEN** the reverse proxy may start and answers Wichteln requests with a gateway error until the service is healthy

#### Scenario: Application waits for its dependencies
- **WHEN** the application starts
- **THEN** it starts only after the production database, the assistant and the WhatsApp bridge are healthy

#### Scenario: Viewers are ordered but not awaited
- **WHEN** the log or database viewer fails to become healthy
- **THEN** the auth proxy still starts

### Requirement: Every long-running service reports its health

Each long-running service SHALL carry a healthcheck that probes it: the application its ping endpoint, the assistant and the WhatsApp bridge their health endpoints, both databases their readiness, the reverse proxies their local health route and the backup service its scheduler process.

#### Scenario: An unhealthy service is reported
- **WHEN** a service's probe fails
- **THEN** the stack reports that service as unhealthy

#### Scenario: The stack waits for healthy services
- **WHEN** the stack is brought up in wait mode
- **THEN** it returns only once every healthchecked service reports healthy

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the development home and the WhatsApp bridge data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host. The assistant's and Wichteln's data SHALL live in the shared production database rather than in dedicated volumes.

#### Scenario: Data survives a stack restart
- **WHEN** the stack is stopped and started again
- **THEN** the databases, the development home and the WhatsApp data are retained

#### Scenario: Assistant and Wichteln share the production database
- **WHEN** the assistant or Wichteln stores data
- **THEN** the data is written to the shared production database and no dedicated database or volume exists for them

### Requirement: nginx terminates TLS and routes the public hostnames

nginx SHALL be the public entrypoint, SHALL serve the ACME challenge and a health endpoint answering `ok` over plain HTTP and redirect everything else to HTTPS, and SHALL route each public hostname and port to its service, including the assistant WebSocket endpoint and the Wichteln app.

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

#### Scenario: The internal APIs stay internal
- **WHEN** a client requests the assistant's Microsoft or WhatsApp API through the public entrypoint
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

The stack SHALL run an authoritative, non-recursive name server for the deployment's zone, whose address records point at the host address substituted at start-up.

#### Scenario: Zone answers authoritatively
- **WHEN** a client queries a name in the deployment's zone
- **THEN** the name server answers authoritatively with the host's address

#### Scenario: Recursion is refused
- **WHEN** a client asks the name server to resolve a name outside its zone
- **THEN** the request is not resolved recursively

### Requirement: The production database is backed up nightly

A backup service SHALL take a full custom-format dump of the production database on the schedule in `BACKUP_SCHEDULE` (default `0 3 * * *`), SHALL store it in the local backup directory, and SHALL delete local dumps older than `RETENTION_DAYS` (default 31) after a successful upload. It SHALL fail loudly at start-up when a required setting is missing.

#### Scenario: Nightly dump is written
- **WHEN** the configured backup schedule fires
- **THEN** a full dump of the production database is written to the local backup directory

#### Scenario: Old dumps are deleted
- **WHEN** a dump was uploaded successfully and a local dump is older than the configured retention
- **THEN** that local dump is deleted

#### Scenario: A failed dump keeps nothing partial
- **WHEN** the dump fails
- **THEN** the partial file is removed and the failure is reported

#### Scenario: Missing configuration stops the service
- **WHEN** a required backup setting is missing
- **THEN** the service fails at start-up instead of scheduling a backup that cannot run

### Requirement: Backups are uploaded to OneDrive

The backup service SHALL upload each dump to a personal OneDrive through the Microsoft Graph API using a delegated refresh token, SHALL target the configured folder (default `Homeserver`) and replace an existing file of the same name, and SHALL keep the local copy when the upload fails.

#### Scenario: Dump is uploaded
- **WHEN** a dump completes and OneDrive is reachable
- **THEN** the dump is uploaded to the configured OneDrive folder, replacing any file of the same name

#### Scenario: Upload failure keeps the local copy
- **WHEN** the upload fails
- **THEN** the local dump is kept and the failure is reported

### Requirement: A backup can be restored into the development or production database

The backup service SHALL be able to replace a target database from a dump file, resolving a bare file name against the local backup directory, refusing to restore when the resolved development connection is the production connection, requiring the confirmation `restore prod` before overwriting the production database, and reporting afterwards that the target application has to be restarted so migrations run.

#### Scenario: Restoring into the development database
- **WHEN** a dump is restored with the development target
- **THEN** the development database's public schema is replaced by the dump

#### Scenario: Restoring into production requires confirmation
- **WHEN** a dump is restored with the production target without the explicit confirmation
- **THEN** the restore does not run

#### Scenario: Restoring into the wrong target is refused
- **WHEN** the development connection resolves to the production connection
- **THEN** the restore is refused

#### Scenario: Restore reports the required restart
- **WHEN** a restore completes
- **THEN** the service reports that the target application must be restarted

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

### Requirement: An infrastructure deploy recreates the whole stack

An infrastructure deploy SHALL force-recreate every service of the stack, including services whose definition did not change, and SHALL remove orphan containers of the stack, meaning containers whose service is no longer defined. It SHALL run for every push to the main branch that changes the stack definition or the infrastructure deploy's own definition.

#### Scenario: Unchanged services are recreated
- **WHEN** an infrastructure deploy runs
- **THEN** every service of the stack is recreated, even when its configuration and image did not change

#### Scenario: Orphan containers are removed
- **WHEN** an infrastructure deploy runs and a container belongs to a service no longer defined in the stack
- **THEN** that container is removed

#### Scenario: A change to the deploy definition triggers a deploy
- **WHEN** a push to the main branch changes only the infrastructure workflow or its deploy action
- **THEN** an infrastructure deploy runs

#### Scenario: A change to the stack definition triggers a deploy
- **WHEN** a push to the main branch changes the stack definition or its mounted configuration
- **THEN** an infrastructure deploy runs
