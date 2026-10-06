# Spec Delta

## Purpose

Defines the development machine: the container that gives developers an SSH and browser-based environment for this repository and that serves the deployment's development hostname.

## ADDED Requirements

### Requirement: The development machine provides an SSH endpoint

The development machine SHALL run an SSH server reachable on the deployment's development SSH port, allowing only the development user and only public-key authentication.

#### Scenario: SSH connection reaches the container
- **WHEN** a developer connects over SSH to the development machine's port
- **THEN** the connection reaches the container's SSH server for the development user

#### Scenario: Password authentication is refused
- **WHEN** a client attempts to authenticate with a password
- **THEN** the attempt is refused

### Requirement: The development machine serves the browser-based development interfaces

The development machine SHALL serve a browser-based code server, the agent web interface and the Storybook, all reached through the reverse proxy on the deployment's development hostname.

#### Scenario: Code server is served
- **WHEN** a developer opens the code server through the proxy
- **THEN** it is served from the development machine

#### Scenario: Agent web interface is served
- **WHEN** a developer opens the agent web interface through the proxy
- **THEN** it is served from the development machine

#### Scenario: Storybook is served
- **WHEN** a developer opens the Storybook through the proxy
- **THEN** it is served from the development machine

### Requirement: The development machine prepares the repository on start

On start the development machine SHALL install the configured git identity and SSH keys, SHALL check out the configured repository into the development home unless the bootstrap is skipped, and SHALL report a failed GitHub authentication instead of coming up half-configured.

#### Scenario: Repository is checked out
- **WHEN** the development machine starts with an empty development home
- **THEN** the configured repository is cloned into the development home

#### Scenario: Failed GitHub authentication is reported
- **WHEN** the development machine cannot authenticate against GitHub
- **THEN** it reports the failure and exposes the public key to add

#### Scenario: Bootstrap can be skipped
- **WHEN** the bootstrap is configured to be skipped
- **THEN** the machine starts without checking out the repository

### Requirement: The development machine carries the toolchain the repository needs

The development machine SHALL provide the runtime, package manager and browser dependencies the repository's build, tests and tooling need, so the development server and its test suites can run inside it.

#### Scenario: Development server runs inside the machine
- **WHEN** a developer starts the application inside the development machine
- **THEN** it runs with the installed runtime and package manager

#### Scenario: Browser-dependent tests can run
- **WHEN** a developer runs the browser-dependent test suite inside the development machine
- **THEN** its operating-system dependencies are already installed
