# dev-machine Specification

## Purpose

Defines the development machine: the container that gives developers an SSH and browser-based environment for this repository, and that runs the development server the deployment's development hostname points at when a developer starts it.

## Requirements

### Requirement: The development machine provides an SSH endpoint

The development machine SHALL run an SSH server reachable on port 2222, allowing only the development user `dev` and only public-key authentication, using a host key generated on first start and stored in the development home.

#### Scenario: SSH connection reaches the container
- **WHEN** a developer connects over SSH to port 2222
- **THEN** the connection reaches the container's SSH server for the user `dev`

#### Scenario: Password authentication is refused
- **WHEN** a client attempts to authenticate with a password
- **THEN** the attempt is refused

### Requirement: The development machine serves the browser-based development interfaces

The development machine SHALL serve a browser-based code server on port 8080, reached through the reverse proxy on the deployment's development hostname. The Storybook SHALL be reachable on its proxied port while a developer runs it. The development machine SHALL instead run Claude Code's Remote Control server, which the machine starts as an always-on service and which reaches Anthropic over outbound HTTPS without exposing any local port or web endpoint.

#### Scenario: Code server is served
- **WHEN** a developer opens the code server through the proxy
- **THEN** it is served from the development machine

#### Scenario: Agent web interface is served
- **WHEN** a developer connects to the running Claude Code Remote Control session from another device
- **THEN** the connection reaches the development machine's local session without a proxied web port

#### Scenario: Storybook is reachable while running
- **WHEN** a developer starts the Storybook in the machine
- **THEN** the proxy publishes it on the Storybook port

### Requirement: The development machine prepares the repository on start

On start the development machine SHALL install the configured git identity, the developer's authorized public keys and a generated SSH key pair, SHALL check out the configured repository into the development home unless the bootstrap is skipped, and SHALL NOT install an agent browser plugin. When the bootstrap cannot authenticate against GitHub it SHALL report the failure together with the public key to add and exit instead of coming up half-configured.

#### Scenario: Repository is checked out
- **WHEN** the development machine starts with an empty development home
- **THEN** the configured repository is cloned into the development home

#### Scenario: Failed GitHub authentication is reported
- **WHEN** the development machine cannot authenticate against GitHub
- **THEN** it reports the failure, prints the public key to add and exits with a failure status

#### Scenario: Bootstrap can be skipped
- **WHEN** the bootstrap is configured to be skipped
- **THEN** the machine starts without checking out the repository and without the GitHub authentication check

### Requirement: The development machine carries the toolchain the repository needs

The development machine SHALL provide the runtime, the package manager and the command-line tools the repository's build, tests and tooling need, so the development server and the test suites that do not need a browser can run inside it. It SHALL carry the operating-system dependencies of the Playwright browsers but SHALL NOT pre-install the browser binaries themselves, which a developer installs on demand.

#### Scenario: Development server runs inside the machine
- **WHEN** a developer starts the application inside the development machine
- **THEN** it runs with the installed runtime and package manager

#### Scenario: Browser binaries are installed on demand
- **WHEN** a developer runs the browser-dependent test suite for the first time
- **THEN** its operating-system dependencies are already present and only the browser binaries have to be downloaded
