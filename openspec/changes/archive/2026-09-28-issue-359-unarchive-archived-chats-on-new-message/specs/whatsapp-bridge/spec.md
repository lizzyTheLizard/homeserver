# Spec Delta

## Purpose

The WhatsApp bridge keeps the local WhatsApp mirror's archive state consistent with WhatsApp's default behaviour, so a chat that receives a new incoming message is no longer treated as archived and resurfaces in the app.

## ADDED Requirements

### Requirement: Incoming messages unarchive archived chats

The bridge SHALL unarchive a chat when wacli stores a new incoming message (a message the user did not send, i.e. `fromMe: false`) for that chat and the chat is currently archived. The bridge SHALL do this for both one-to-one chats and group chats, so the chat is returned with `isArchived: false` and appears in the app's unarchived-chats overview.

#### Scenario: Incoming message unarchives an archived one-to-one chat

- **WHEN** a new incoming message from a contact is stored for a one-to-one chat that is archived
- **THEN** the bridge unarchives that chat, and it is subsequently reported with `isArchived: false`

#### Scenario: Incoming message unarchives an archived group chat

- **WHEN** a new incoming message is stored for a group chat that is archived
- **THEN** the bridge unarchives that group chat, and it is subsequently reported with `isArchived: false`

### Requirement: Only incoming messages trigger unarchiving

The bridge SHALL NOT unarchive a chat in response to a message the user sent themselves (`fromMe: true`), and SHALL leave an archived chat archived while it receives no new incoming message. Unarchiving an already-unarchived chat SHALL be a no-op.

#### Scenario: Outgoing message does not unarchive

- **WHEN** a message the user sent themselves is stored for a chat that is archived
- **THEN** the chat remains archived

#### Scenario: No new message keeps the chat archived

- **WHEN** an archived chat receives no new incoming message
- **THEN** the chat remains archived

#### Scenario: Already-unarchived chat is unchanged

- **WHEN** a new incoming message is stored for a chat that is not archived
- **THEN** the chat remains unarchived and no archive change is made
