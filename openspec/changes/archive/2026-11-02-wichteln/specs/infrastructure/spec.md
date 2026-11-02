# Spec Delta

## ADDED Requirements

### Requirement: The Wichteln app runs as its own internal service

The stack SHALL run the Wichteln app as its own service on the shared network and SHALL NOT publish the app outside the stack; it is reached only through the reverse proxy.

#### Scenario: App is internal

- **WHEN** the stack is running
- **THEN** the Wichteln app is reachable directly only from the stack's network, and from outside only through nginx

## MODIFIED Requirements

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
