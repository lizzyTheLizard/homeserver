# Spec Delta

## Purpose

Defines the deployed infrastructure: the docker-compose stack that runs the production and development services, the reverse proxies and TLS termination that publish them, the authoritative DNS, and the backup and restore of the production database.

## ADDED Requirements

### Requirement: The stack runs as one docker-compose project

The deployment SHALL be a single docker-compose stack whose services share one network and address each other by service name, and SHALL NOT publish the databases.

#### Scenario: Services reach each other by name
- **WHEN** one service calls another
- **THEN** it uses the other service's name on the shared network

#### Scenario: Databases are not published
- **WHEN** the stack is running
- **THEN** neither the production nor the development database is reachable from outside the stack

### Requirement: Services start once their dependencies are healthy

The stack SHALL gate a service's start on the health of the services it depends on, so that the reverse proxy starts only after the application, the assistant and the auth proxy are healthy, and the application starts only after the production database, the assistant and the WhatsApp bridge are healthy.

#### Scenario: Proxy waits for the application
- **WHEN** the stack starts and the application is not yet healthy
- **THEN** the reverse proxy does not start serving until the application reports healthy

#### Scenario: Application waits for its dependencies
- **WHEN** the application starts
- **THEN** it starts only after the production database, the assistant and the WhatsApp bridge are healthy

### Requirement: The stack keeps its data in named volumes

The production database, the development database, the development home and the WhatsApp bridge data SHALL live in named volumes that survive a restart or re-creation of the stack, while certificates, backups and configuration are mounted from the host.

#### Scenario: Data survives a stack restart
- **WHEN** the stack is stopped and started again
- **THEN** the databases, the development home and the WhatsApp data are retained

### Requirement: Application images are supplied, never pulled

The application, assistant, WhatsApp bridge and development-machine images SHALL be built by the pipeline and loaded onto the host, and the stack SHALL NOT pull them from a registry.

#### Scenario: Stack uses the supplied images
- **WHEN** the stack starts the application services
- **THEN** it runs the locally loaded images of the deployed revision

### Requirement: nginx terminates TLS and routes the public hostnames

nginx SHALL be the public entrypoint, SHALL serve the ACME challenge and a health endpoint over plain HTTP and redirect everything else to HTTPS, and SHALL route each public hostname and port to its service, including the assistant WebSocket endpoint.

#### Scenario: Plain HTTP is redirected
- **WHEN** a request arrives over plain HTTP that is not an ACME challenge or the health endpoint
- **THEN** it is redirected to HTTPS

#### Scenario: ACME challenge is served
- **WHEN** the certificate authority requests an ACME challenge over plain HTTP
- **THEN** nginx serves the challenge from the shared webroot

#### Scenario: Public hostname reaches its service
- **WHEN** a request arrives for one of the published hostnames
- **THEN** nginx forwards it to that hostname's service

#### Scenario: Assistant WebSocket is proxied
- **WHEN** a client connects to the assistant WebSocket endpoint
- **THEN** nginx upgrades and forwards the connection to the assistant service

### Requirement: The internal user interfaces are gated by basic auth

The container-log viewer, the database viewer, the code server, the harness UI and the Storybook SHALL be reachable only through a basic-auth proxy that distinguishes an administrative credential from a development credential, and SHALL NOT be published directly.

#### Scenario: Logs and database viewers require the administrative credential
- **WHEN** a client opens the log viewer or the database viewer
- **THEN** the administrative credential is required

#### Scenario: Development interfaces require the development credential
- **WHEN** a client opens the code server, the harness UI or the Storybook
- **THEN** the development credential is required

### Requirement: Certificates are issued and renewed automatically

A certificate service SHALL renew the stack's certificates periodically and the reverse proxy SHALL reload its configuration so renewed certificates take effect without a manual restart.

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

A backup service SHALL take a full dump of the production database on a configurable schedule, SHALL store it locally, and SHALL delete local dumps older than a configurable retention so that only recent dumps are kept.

#### Scenario: Nightly dump is written
- **WHEN** the configured backup schedule fires
- **THEN** a full dump of the production database is written to the local backup directory

#### Scenario: Old dumps are deleted
- **WHEN** a local dump is older than the configured retention
- **THEN** it is deleted

#### Scenario: A failed dump keeps nothing partial
- **WHEN** the dump fails
- **THEN** the partial file is removed and the failure is reported

### Requirement: Backups are uploaded to OneDrive

The backup service SHALL upload each dump to a personal OneDrive through the Microsoft Graph API using a delegated refresh token, replacing an existing file of the same name, and SHALL keep the local copy when the upload fails.

#### Scenario: Dump is uploaded
- **WHEN** a dump completes and OneDrive is reachable
- **THEN** the dump is uploaded to the configured OneDrive folder, replacing any file of the same name

#### Scenario: Upload failure keeps the local copy
- **WHEN** the upload fails
- **THEN** the local dump is kept and the failure is reported

### Requirement: A backup can be restored into the development or production database

The backup service SHALL be able to replace a target database from a dump file, resolving a bare file name against the local backup directory, refusing to restore into a target that is not the requested one, requiring an explicit confirmation before overwriting the production database, and requiring the application to be restarted afterwards so migrations run.

#### Scenario: Restoring into the development database
- **WHEN** a dump is restored with the development target
- **THEN** the development database's public schema is replaced by the dump

#### Scenario: Restoring into production requires confirmation
- **WHEN** a dump is restored with the production target without the explicit confirmation
- **THEN** the restore does not run

#### Scenario: Restoring into the wrong target is refused
- **WHEN** the requested target does not match the connection that would be overwritten
- **THEN** the restore is refused

#### Scenario: Restore reports the required restart
- **WHEN** a restore completes
- **THEN** the service reports that the target application must be restarted

### Requirement: The stack restarts its services automatically

Every long-running service SHALL restart automatically unless it was stopped deliberately, except the certificate service, which SHALL run only its periodic renewal loop.

#### Scenario: A crashed service is restarted
- **WHEN** a long-running service exits unexpectedly
- **THEN** the stack starts it again

#### Scenario: Certificate service does not restart on its own
- **WHEN** the certificate service's renewal process ends
- **THEN** it is not restarted automatically
