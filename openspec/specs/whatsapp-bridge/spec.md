# whatsapp-bridge Specification

## Purpose

The WhatsApp bridge drives one wacli process per user: it keeps the local WhatsApp mirror's archive state consistent with WhatsApp's default behaviour, so a chat that receives a new incoming message resurfaces in the app, and it handles wacli commands predictably — short commands are bounded by a timeout, operations that take the store lock are serialised per user, and errors and warnings are ignored, logged or surfaced as appropriate.

## Requirements

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

### Requirement: A session reports its status

The bridge SHALL report a session's status as needing authentication with the current QR code, as connected, as running a full sync, or as closed.

#### Scenario: Unpaired session reports its QR code
- **WHEN** the status of a session that needs authentication is requested
- **THEN** it reports that pairing is needed together with the current QR code

#### Scenario: Unknown session reports closed
- **WHEN** the status of a user who has never started a session is requested
- **THEN** it reports the session as closed

### Requirement: Incoming messages unarchive archived chats

The bridge SHALL unarchive a chat when a new incoming message (a message the user did not send, i.e. `fromMe: false`) is stored for that chat and the chat is currently archived. The bridge SHALL do this for both one-to-one chats and group chats, so the chat is returned with `isArchived: false` and appears in the app's unarchived-chats overview.

#### Scenario: Incoming message unarchives an archived one-to-one chat
- **WHEN** a new incoming message from a contact is stored for a one-to-one chat that is archived
- **THEN** the bridge unarchives that chat, and it is subsequently reported with `isArchived: false`

#### Scenario: Incoming message unarchives an archived group chat
- **WHEN** a new incoming message is stored for a group chat that is archived
- **THEN** the bridge unarchives that group chat, and it is subsequently reported with `isArchived: false`

### Requirement: Only incoming messages trigger unarchiving

The bridge SHALL NOT unarchive a chat in response to a message the user sent themselves (`fromMe: true`), and SHALL leave an archived chat archived while it receives no new incoming message. The bridge SHALL check a chat's current archive state before changing it, so a chat that is already unarchived is left untouched, and concurrent deliveries for the same chat SHALL result in at most one unarchive.

#### Scenario: Outgoing message does not unarchive
- **WHEN** a message the user sent themselves is stored for a chat that is archived
- **THEN** the chat remains archived

#### Scenario: No new message keeps the chat archived
- **WHEN** an archived chat receives no new incoming message
- **THEN** the chat remains archived

#### Scenario: Already-unarchived chat is unchanged
- **WHEN** a new incoming message is stored for a chat that is not archived
- **THEN** the chat remains unarchived and no archive change is made

#### Scenario: A failing unarchive does not fail the delivery
- **WHEN** unarchiving the chat fails
- **THEN** the failure is logged and the delivery is still acknowledged

### Requirement: Webhook deliveries are authenticated

The bridge SHALL verify every incoming wacli webhook delivery against the session's own secret with an HMAC-SHA256 signature over the raw request body, and SHALL reject a delivery whose signature is missing, malformed or does not match.

#### Scenario: Correctly signed delivery is accepted
- **WHEN** a delivery carrying a valid signature for the session's secret arrives
- **THEN** it is processed

#### Scenario: Unsigned delivery is rejected
- **WHEN** a delivery arrives without a signature, with a malformed one, or with one that does not match the session's secret
- **THEN** it is rejected and no chat is changed

### Requirement: Short-lived wacli commands have a bounded default timeout

The bridge SHALL abort a short-lived wacli command that does not finish within `WHATSAPP_CMD_TIMEOUT_MS`, which defaults to 20000 ms and remains configurable. The abort SHALL fail the command rather than leave it hanging, and waiting for the store lock SHALL not count against this timeout.

#### Scenario: Hung short command is aborted at the default timeout
- **WHEN** a short-lived wacli command does not finish within 20000 ms under the default configuration
- **THEN** the bridge kills the command and reports it as failed

#### Scenario: Configured timeout overrides the default
- **WHEN** `WHATSAPP_CMD_TIMEOUT_MS` is configured to a different value
- **THEN** short-lived wacli commands are aborted after that value instead of 20000 ms

### Requirement: Operations that take the store lock run one at a time per user

The bridge SHALL run the operations that take a user store's lock — starting the session, stopping it, disconnecting, archiving or unarchiving a chat, and running a full sync — one at a time per user. A second such operation for the same user SHALL wait for the running one instead of failing, and SHALL then run. Stores are independent: an operation on one user SHALL NOT delay another user's operation.

#### Scenario: A second lock-taking operation waits
- **WHEN** a lock-taking operation is running for a user and another one is requested for the same user
- **THEN** the second operation waits until the first has finished, then runs

#### Scenario: Different users do not block each other
- **WHEN** a lock-taking operation is running for one user and one is requested for another user
- **THEN** the second one runs without waiting for the first

#### Scenario: Archiving pauses the follow sync
- **WHEN** a chat is archived or unarchived
- **THEN** the follow sync is stopped first and restarts on the next request that needs the session

### Requirement: Plain commands and long-running processes may overlap

The bridge SHALL run the short-lived commands that only read or send — listing chats, listing messages and sending a message — without taking the store lock, so that several of them, and a long-running wacli process, SHALL be allowed to run concurrently and SHALL NOT be rejected because another command is running for the same store.

#### Scenario: Short commands run concurrently
- **WHEN** two short-lived commands are requested for the same store
- **THEN** both run, neither being rejected because of the other

#### Scenario: Short command during a long-running process is not rejected
- **WHEN** a short-lived command is requested while the follow sync or a full sync runs for that store
- **THEN** the command runs instead of being rejected

### Requirement: A full sync is bounded and reports its own status

The bridge SHALL run a full sync as a bounded operation that refreshes contacts, groups and channels and exits when idle, SHALL report the session as running a full sync while it runs, and SHALL start no second full sync for the same user while one is running.

#### Scenario: Full sync reports its status
- **WHEN** a full sync is started and has not finished
- **THEN** the session reports that it is running a full sync

#### Scenario: Second full sync is a no-op
- **WHEN** a full sync is requested while one is already running for that user
- **THEN** no second full sync is started

#### Scenario: Full sync failure is logged
- **WHEN** a full sync fails
- **THEN** the failure is logged and the session is closed again

### Requirement: Errors from a stopped wacli process are ignored

The bridge SHALL ignore an error reported by a wacli process that is no longer tracked as running — either because it is being stopped deliberately or because it has already stopped — and SHALL NOT change the session status or report the error to callers in response.

#### Scenario: Error while stopping is ignored
- **WHEN** a session is being stopped deliberately and its wacli process reports an error
- **THEN** the session status does not change and no error is reported

#### Scenario: Error after the process stopped is ignored
- **WHEN** a wacli process has already stopped and a late error event arrives for it
- **THEN** the session status does not change and no error is reported

### Requirement: wacli warning events are logged at warn level

The bridge SHALL log every wacli warning event at warn level, including its message, without changing the session status in response.

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

### Requirement: The bridge serves a per-user REST API

The bridge SHALL expose a REST API scoped per user that reports the session status, starts the session, lists chats and messages, sends a message, archives and unarchives a chat, starts a full sync and disconnects the account, and SHALL accept wacli's events through a callback.

#### Scenario: Status and chats are served
- **WHEN** the application asks for a user's session status or chats
- **THEN** the bridge answers for that user's session

#### Scenario: Messages are listed per chat
- **WHEN** the application asks for a user's messages and names the chat
- **THEN** the bridge answers with that chat's messages and rejects a request that names no chat

#### Scenario: Actions are served
- **WHEN** the application asks the bridge to send a message, archive or unarchive a chat, start a full sync or disconnect
- **THEN** the bridge performs that action for the user's session

#### Scenario: wacli events are received
- **WHEN** a user's wacli process reports an event
- **THEN** the bridge receives it through the callback and updates that user's session

### Requirement: The bridge answers a health check

The bridge SHALL expose a health endpoint and SHALL listen on its configured port.

#### Scenario: Health endpoint answers
- **WHEN** the bridge is healthy and its health endpoint is requested
- **THEN** it answers successfully
