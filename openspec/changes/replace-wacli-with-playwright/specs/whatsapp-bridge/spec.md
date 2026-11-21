# Spec Delta

## ADDED Requirements

### Requirement: The bridge drives one WhatsApp Web browser session per user

The bridge SHALL run one headless browser session per user that is logged in to WhatsApp Web as a linked device, and SHALL keep each user's session and login state isolated from every other user's.

#### Scenario: Each user has their own browser session
- **WHEN** two users use WhatsApp
- **THEN** each has their own browser session and login state, and neither sees the other's chats

#### Scenario: Unpaired user gets a QR code
- **WHEN** a user's session is not logged in to WhatsApp Web
- **THEN** the bridge shows that user's current WhatsApp Web QR code instead of chats

#### Scenario: Pairing survives a restart
- **WHEN** a paired user's bridge container restarts
- **THEN** the user's next request resumes the logged-in session without scanning a QR code again

### Requirement: Chats are read live from WhatsApp Web

The bridge SHALL list a user's chats as WhatsApp Web currently shows them, including archived chats and chats with old activity, each with its stable id, name, archived flag, group flag and last-message timestamp, ordered by last message, and SHALL NOT depend on a locally mirrored history.

#### Scenario: Archived chats are listed as archived
- **WHEN** the chats of a user with archived chats are requested
- **THEN** every archived chat is returned with `isArchived: true` and every other chat with `isArchived: false`

#### Scenario: Old chats are listed
- **WHEN** the user has a chat whose last message is months old and the chats are requested
- **THEN** that chat is returned with its last-message timestamp

#### Scenario: Chats reflect WhatsApp's own state
- **WHEN** a chat is archived or unarchived on the user's phone, or a new incoming message unarchives it, and the chats are requested afterwards
- **THEN** the returned `isArchived` matches WhatsApp's state

### Requirement: Messages are read live per chat

The bridge SHALL return the text messages of the named chat as WhatsApp Web shows them (id, sent-by-me flag, sender name, content and timestamp), oldest first, and SHALL answer an unknown chat id with an error rather than with another chat's messages.

#### Scenario: Messages of a chat are returned
- **WHEN** the messages of an existing chat are requested
- **THEN** its text messages are returned with their timestamps and sender names, the user's own messages marked `fromMe: true`

#### Scenario: Unknown chat is an error
- **WHEN** the messages of a chat id that does not exist for the user are requested
- **THEN** the request fails and no messages of another chat are returned

### Requirement: Send, archive and mark-as-read act on WhatsApp Web

The bridge SHALL send a text message to a chat, archive or unarchive a chat, and mark a chat as read by performing the action in the user's WhatsApp Web session, and SHALL fail the request when the action could not be verified in that session.

#### Scenario: Message is sent
- **WHEN** a text message is sent to an existing chat
- **THEN** it appears as a sent message in that chat

#### Scenario: Archive state changes
- **WHEN** a chat is archived or unarchived
- **THEN** WhatsApp shows the chat in the archive or in the main list accordingly, and subsequent chat listings report that state

#### Scenario: Unverifiable action fails
- **WHEN** an action cannot be confirmed in the session, for example because the chat is not found
- **THEN** the request fails with an error

### Requirement: Operations on one user's session run one at a time

The bridge SHALL run the operations that use a user's browser page — listing chats, listing messages, sending, archiving, marking read, refreshing — one at a time per user; a second operation for the same user SHALL wait and then run instead of failing, and operations of different users SHALL NOT delay each other.

#### Scenario: Concurrent requests for one user are serialised
- **WHEN** a chat listing and a message listing are requested at the same time for the same user
- **THEN** both succeed, one after the other

#### Scenario: Different users do not block each other
- **WHEN** an operation is running for one user and another is requested for a different user
- **THEN** the second runs without waiting for the first

### Requirement: Operations in the browser are bounded

The bridge SHALL abort an operation in the browser that does not finish within `WHATSAPP_CMD_TIMEOUT_MS` (default 20000 ms, configurable) and fail the request, without leaving the user's session unusable for later requests.

#### Scenario: Hung operation fails at the timeout
- **WHEN** an operation does not finish within the configured timeout
- **THEN** the request fails and a later request for the same user is served normally

### Requirement: A lost session is reported and recoverable

The bridge SHALL detect that a user's browser crashed or that WhatsApp logged the device out (for example unlinked on the phone), SHALL report the session as needing authentication or as closed accordingly, and SHALL recreate the browser on the next start request.

#### Scenario: Unlinked device needs authentication again
- **WHEN** the linked device is removed on the user's phone
- **THEN** the session status reports that authentication is needed with a new QR code

#### Scenario: Browser crash is recovered
- **WHEN** the user's browser process dies
- **THEN** the session reports `closed` and the next start request launches a new browser that resumes the login

### Requirement: Full sync reloads WhatsApp Web

The bridge SHALL treat a full-sync request as a reload of the user's WhatsApp Web session with a fresh scan of the chat list including the archive, SHALL report the session as running a full sync while it runs, and SHALL start no second full sync for the same user while one is running.

#### Scenario: Full sync reports its status
- **WHEN** a full sync is started and has not finished
- **THEN** the session reports that it is running a full sync

#### Scenario: Second full sync is a no-op
- **WHEN** a full sync is requested while one is already running for that user
- **THEN** no second full sync is started

#### Scenario: Full sync failure is logged
- **WHEN** a full sync fails
- **THEN** the failure is logged and the session is closed again

### Requirement: The bridge exposes a per-user REST API

The bridge SHALL expose a REST API scoped per user that reports the session status, starts the session, lists chats and messages, sends a message, archives and unarchives a chat, marks a chat as read, starts a full sync and disconnects the account, with the same paths and request and response shapes as before this change.

#### Scenario: Status and chats are served
- **WHEN** the application asks for a user's session status or chats
- **THEN** the bridge answers for that user's session

#### Scenario: Messages are listed per chat
- **WHEN** the application asks for a user's messages and names the chat
- **THEN** the bridge answers with that chat's messages and rejects a request that names no chat

#### Scenario: Actions are served
- **WHEN** the application asks the bridge to send a message, archive or unarchive a chat, mark a chat read, start a full sync or disconnect
- **THEN** the bridge performs that action for the user's session

#### Scenario: Disconnect logs the account out
- **WHEN** the application asks the bridge to disconnect a user
- **THEN** the linked device is logged out, the user's stored browser profile is deleted and the session reports `closed`

## MODIFIED Requirements

### Requirement: A session reports its status

The bridge SHALL report a session's status as needing authentication with the current QR code, as connected, as running a full sync, or as closed.

#### Scenario: Unpaired session reports its QR code
- **WHEN** the status of a session that needs authentication is requested
- **THEN** it reports that pairing is needed together with the current WhatsApp Web QR code

#### Scenario: Paired session is connected
- **WHEN** the status of a session that is logged in to WhatsApp Web is requested
- **THEN** it reports the session as connected

#### Scenario: Unknown session reports closed
- **WHEN** the status of a user who has never started a session is requested
- **THEN** it reports the session as closed

### Requirement: The WhatsApp bridge service is named whatsapp

The WhatsApp bridge service, its workspace package and its container image SHALL be named `whatsapp` rather than `whatsapp-bridge`, while its REST API and health endpoint SHALL remain unchanged.

#### Scenario: The service is known as whatsapp
- **WHEN** the WhatsApp bridge is referenced in the workspace, the compose stack or the pipeline
- **THEN** it is referred to as `whatsapp` with the image `homeserver:whatsapp`

#### Scenario: Bridge behaviour is unchanged
- **WHEN** the WhatsApp bridge runs under its new name
- **THEN** it exposes the same REST API and reports the same health status

## REMOVED Requirements

### Requirement: The bridge runs one wacli process per user
**Reason**: wacli is replaced by a Playwright-driven WhatsApp Web session.
**Migration**: See "The bridge drives one WhatsApp Web browser session per user".

### Requirement: Incoming messages unarchive archived chats
**Reason**: There is no local mirror to correct; WhatsApp itself unarchives a chat on a new incoming message and the live view shows it.
**Migration**: See "Chats are read live from WhatsApp Web".

### Requirement: Only incoming messages trigger unarchiving
**Reason**: The bridge no longer changes archive state on its own.
**Migration**: None; archive state follows WhatsApp.

### Requirement: Webhook deliveries are authenticated
**Reason**: The internal wacli webhook no longer exists.
**Migration**: None.

### Requirement: Short-lived wacli commands have a bounded default timeout
**Reason**: There are no wacli commands.
**Migration**: See "Operations in the browser are bounded".

### Requirement: Operations that take the store lock run one at a time per user
**Reason**: There is no store lock; page access is serialised instead.
**Migration**: See "Operations on one user's session run one at a time".

### Requirement: Plain commands and long-running processes may overlap
**Reason**: There are no separate sync processes to overlap with.
**Migration**: See "Operations on one user's session run one at a time".

### Requirement: A full sync is bounded and reports its own status
**Reason**: Full sync no longer refreshes a mirror.
**Migration**: See "Full sync reloads WhatsApp Web".

### Requirement: Errors from a stopped wacli process are ignored
**Reason**: There are no wacli processes.
**Migration**: See "A lost session is reported and recoverable".

### Requirement: wacli warning events are logged at warn level
**Reason**: There are no wacli events.
**Migration**: None.

### Requirement: LTHash mismatch warnings fail the pending start
**Reason**: LTHash mismatches are a whatsmeow/wacli sync problem that does not occur with WhatsApp Web.
**Migration**: None.

### Requirement: The bridge serves a per-user REST API
**Reason**: Replaced by "The bridge exposes a per-user REST API"; the wacli event callback no longer exists.
**Migration**: Same paths and shapes, see the replacement requirement.
