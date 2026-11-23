# Spec Delta

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: The production database is backed up nightly
**Reason**: The backup is now its own service with its own capability spec.
**Migration**: See the same requirement in the `backup` spec; its behaviour is unchanged.

### Requirement: Backups are uploaded to OneDrive
**Reason**: The backup is now its own service with its own capability spec.
**Migration**: See the same requirement in the `backup` spec; its behaviour is unchanged.

### Requirement: A backup can be restored into the development or production database
**Reason**: The backup is now its own service with its own capability spec.
**Migration**: See the same requirement in the `backup` spec; its behaviour is unchanged.
