# Spec Delta

## ADDED Requirements

### Requirement: The WhatsApp bridge service is named whatsapp

The WhatsApp bridge service, its workspace package and its container image SHALL be named `whatsapp` rather than `whatsapp-bridge`, while its runtime behaviour — the per-user wacli processes, isolated stores, REST API and health endpoint — SHALL remain unchanged.

#### Scenario: The service is known as whatsapp
- **WHEN** the WhatsApp bridge is referenced in the workspace, the compose stack or the pipeline
- **THEN** it is referred to as `whatsapp` with the image `homeserver:whatsapp`

#### Scenario: Bridge behaviour is unchanged
- **WHEN** the WhatsApp bridge runs under its new name
- **THEN** it still drives one wacli process per user, keeps each user's store isolated, exposes the same REST API and reports the same health status
