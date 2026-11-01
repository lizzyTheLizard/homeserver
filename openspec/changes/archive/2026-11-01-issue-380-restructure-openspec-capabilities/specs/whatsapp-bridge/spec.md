# Spec Delta

## ADDED Requirements

### Requirement: The bridge runs one wacli process per user

The bridge SHALL manage one wacli process per user — an authentication process that emits QR codes while the user is unpaired, and a follow sync that keeps the user's message mirror live while paired — and SHALL keep each user's session and mirror isolated from every other user's.

#### Scenario: Each user has their own process and store
- **WHEN** two users use WhatsApp
- **THEN** each has their own wacli process and their own isolated session and mirror

#### Scenario: Unpaired user gets an authentication process
- **WHEN** a user's session is not paired
- **THEN** the bridge runs an authentication process for that user that emits QR codes

#### Scenario: Paired user gets a live mirror
- **WHEN** a user's session is paired
- **THEN** the bridge runs a follow sync that keeps that user's mirror live

### Requirement: The bridge serves a per-user REST API

The bridge SHALL expose a REST API scoped per user that reports the session status, starts the session, lists chats and messages, sends a message, archives a chat, starts a full sync and disconnects the account, and SHALL accept wacli's events through a callback.

#### Scenario: Status and chats are served
- **WHEN** the application asks for a user's session status or chats
- **THEN** the bridge answers for that user's session

#### Scenario: Actions are served
- **WHEN** the application asks the bridge to send a message, archive a chat, start a full sync or disconnect
- **THEN** the bridge performs that action for the user's session

#### Scenario: wacli events are received
- **WHEN** a user's wacli process reports an event
- **THEN** the bridge receives it through the callback and updates that user's session

### Requirement: The bridge answers a health check

The bridge SHALL expose a health endpoint and SHALL listen on its configured port.

#### Scenario: Health endpoint answers
- **WHEN** the bridge is healthy and its health endpoint is requested
- **THEN** it answers successfully
