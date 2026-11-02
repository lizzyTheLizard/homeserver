# Spec Delta

## MODIFIED Requirements

### Requirement: The development machine serves the browser-based development interfaces

The development machine SHALL serve a browser-based code server on port 8080, reached through the reverse proxy on the deployment's development hostname. The Storybook SHALL be reachable on its proxied port while a developer runs it. The development machine SHALL instead run Claude Code's Remote Control server, which the machine starts as an always-on service and which reaches Anthropic over outbound HTTPS without exposing any local port or web endpoint. The Remote Control server SHALL spawn its sessions in the same directory, the repository checkout in the development home, rather than in isolated worktrees or a single fixed session.

#### Scenario: Code server is served
- **WHEN** a developer opens the code server through the proxy
- **THEN** it is served from the development machine

#### Scenario: Agent web interface is served
- **WHEN** a developer connects to the running Claude Code Remote Control session from another device
- **THEN** the connection reaches the development machine's local session without a proxied web port

#### Scenario: Remote sessions start in the repository
- **WHEN** a developer starts a new session through Remote Control
- **THEN** the session is spawned in the repository checkout in the development home

#### Scenario: Storybook is reachable while running
- **WHEN** a developer starts the Storybook in the machine
- **THEN** the proxy publishes it on the Storybook port
