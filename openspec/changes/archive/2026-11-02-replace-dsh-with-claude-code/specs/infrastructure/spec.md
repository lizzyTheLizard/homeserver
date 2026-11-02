# Spec Delta

## MODIFIED Requirements

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
