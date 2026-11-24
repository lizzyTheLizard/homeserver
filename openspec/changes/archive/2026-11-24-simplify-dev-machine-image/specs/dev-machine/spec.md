## MODIFIED Requirements

### Requirement: The development machine provides an SSH endpoint

The development machine SHALL run an SSH server reachable on port 2222, allowing only the development user `ubuntu` and only public-key authentication, using a host key generated on first start and stored in the development home.

#### Scenario: SSH connection reaches the container
- **WHEN** a developer connects over SSH to port 2222
- **THEN** the connection reaches the container's SSH server for the user `ubuntu`

#### Scenario: Password authentication is refused
- **WHEN** a client attempts to authenticate with a password
- **THEN** the attempt is refused
