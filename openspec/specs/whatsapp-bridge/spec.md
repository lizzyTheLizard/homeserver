# whatsapp-bridge Specification

## Purpose

The WhatsApp bridge drives one wacli process per user: it keeps the local WhatsApp mirror's archive state consistent with WhatsApp's default behaviour, so a chat that receives a new incoming message resurfaces in the app, and it handles wacli commands and events predictably — short commands are bounded and serialised per store, long-running processes wait for a running short command, and errors and warnings are ignored, logged or surfaced as appropriate.

## Requirements

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

### Requirement: Short-lived wacli commands have a bounded default timeout

The bridge SHALL abort a short-lived wacli command that does not finish within `WHATSAPP_CMD_TIMEOUT_MS`, which defaults to 20000 ms and remains configurable. The abort SHALL fail the command rather than leave it hanging.

#### Scenario: Hung short command is aborted at the default timeout

- **WHEN** a short-lived wacli command does not finish within 20000 ms under the default configuration
- **THEN** the bridge kills the command and reports it as failed

#### Scenario: Configured timeout overrides the default

- **WHEN** `WHATSAPP_CMD_TIMEOUT_MS` is configured to a different value
- **THEN** short-lived wacli commands are aborted after that value instead of 20000 ms

### Requirement: At most one short-lived wacli command per store

The bridge SHALL allow at most one short-lived wacli command per user store at a time. While a short-lived command is running for a store, the bridge SHALL reject any further short-lived command for that store immediately, without running it. Stores are independent: activity in one store SHALL NOT reject commands in another.

#### Scenario: Second concurrent short command is rejected

- **WHEN** a short-lived command is running for a store and another short-lived command is requested for the same store
- **THEN** the second command fails immediately without being executed

#### Scenario: Different stores do not block each other

- **WHEN** a short-lived command is running for one store and a short-lived command is requested for another store
- **THEN** the second command is accepted and may run concurrently

### Requirement: A long-running wacli process waits for a running short command

The bridge SHALL NOT start a long-running wacli process for a store while a short-lived command for that store is still running. The long-running process SHALL wait until the short-lived command has finished, and SHALL start without delay when no short-lived command is running. A full sync is subject to the same rule.

#### Scenario: Long-running process waits for the short command

- **WHEN** a long-running wacli process is requested for a store while a short-lived command is running for that store
- **THEN** the long-running process starts only after the short-lived command has finished

#### Scenario: Long-running process starts without waiting when idle

- **WHEN** a long-running wacli process is requested for a store and no short-lived command is running for it
- **THEN** the long-running process starts without waiting

### Requirement: Errors from a stopped wacli process are ignored

The bridge SHALL ignore an error reported by a wacli process that is no longer tracked as running — either because it is being stopped deliberately or because it has already stopped — and SHALL NOT change the session status or report the error to callers in response.

#### Scenario: Error while stopping is ignored

- **WHEN** a session is being stopped deliberately and its wacli process reports an error
- **THEN** the session status does not change and no error is reported

#### Scenario: Error after the process stopped is ignored

- **WHEN** a wacli process has already stopped and a late error event arrives for it
- **THEN** the session status does not change and no error is reported

### Requirement: wacli warning events are logged at warn level

The bridge SHALL log every wacli warning event at warn level, including its code and message, without changing the session status in response.

#### Scenario: Warning is logged without failing the session

- **WHEN** a wacli warning event arrives on a running session
- **THEN** the bridge logs it at warn level and the session remains in its current state

### Requirement: LTHash mismatch warnings fail the pending start

The bridge SHALL treat a wacli warning whose message contains `hit an LTHash mismatch` as an error for the pending start: it SHALL log the warning at warn level and SHALL fail the start request, without changing the session status. The bridge SHALL leave wacli's own recovery behaviour untouched.

#### Scenario: LTHash mismatch fails the pending start request

- **WHEN** a session is starting and a warning containing `hit an LTHash mismatch` arrives from its wacli process
- **THEN** the bridge logs the warning at warn level, the start request fails, and the session status is unchanged

#### Scenario: LTHash mismatch after shutdown is ignored

- **WHEN** a session is being stopped or its wacli process has already stopped and a warning containing `hit an LTHash mismatch` arrives
- **THEN** the session status does not change and no start request fails

#### Scenario: Other warnings do not fail the session

- **WHEN** a warning whose message does not contain `hit an LTHash mismatch` arrives
- **THEN** the session remains in its current state

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
