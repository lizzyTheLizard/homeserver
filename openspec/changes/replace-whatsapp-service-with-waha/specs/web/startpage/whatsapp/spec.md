# Spec Delta

## ADDED Requirements

### Requirement: Each user has their own WAHA session

The web application SHALL use one WAHA session per signed-in user, named deterministically from the user's identity, SHALL create and start it on first use, and SHALL never read or act on another user's session.

#### Scenario: First use creates the user's session
- **WHEN** a user opens the WhatsApp area for the first time
- **THEN** a WAHA session for that user is created and started and the page shows its QR code

#### Scenario: Users are isolated
- **WHEN** two users use WhatsApp
- **THEN** each sees only the chats and messages of their own session

### Requirement: WAHA's session state maps to the connection status

The web application SHALL report WAHA's session state as needing authentication with the current QR code while it waits for a scan, as connected while it works, as running a full sync while the session is starting, for example after a restart triggered by the user, and as closed when the session is stopped, missing or failed.

#### Scenario: Waiting for a scan
- **WHEN** the user's WAHA session is waiting for a QR scan
- **THEN** the status is "needs authentication" with the current QR code

#### Scenario: Working session is connected
- **WHEN** the user's WAHA session is working
- **THEN** the status is connected

#### Scenario: Missing or failed session is closed
- **WHEN** the user has no WAHA session, or it is stopped or has failed
- **THEN** the status is closed

### Requirement: Chats and messages are read live from WAHA

The web application SHALL list the user's chats, including archived and old chats with their archived flag, group flag and last-message time, and a chat's text messages from WAHA at the time of the request, without keeping its own copy, and SHALL return the same data shapes as before the change.

#### Scenario: Archived chats are listed as archived
- **WHEN** the chats of a user with archived chats are requested
- **THEN** every archived chat is listed with the archived flag set and all other chats with it unset

#### Scenario: Old chats are listed
- **WHEN** the user has a chat whose last message is months old
- **THEN** that chat is listed with its last-message time

#### Scenario: Messages are read per chat
- **WHEN** a chat's messages are requested
- **THEN** its text messages are returned oldest first with sender name, own-message flag and time

### Requirement: Send, archive, read and full sync act through WAHA

The web application SHALL send a text message, archive or unarchive a chat, mark a chat read, run a full sync by restarting the user's WAHA session, and disconnect by logging the session out, each through WAHA's API for the user's own session, and SHALL surface a failed WAHA call as an error.

#### Scenario: Message is sent through WAHA
- **WHEN** the user sends a reply
- **THEN** WAHA sends the text to that chat from the user's session

#### Scenario: Full sync restarts the session
- **WHEN** the user starts a full sync
- **THEN** the user's WAHA session is restarted and the page reports that it may take a while

#### Scenario: Disconnect logs out
- **WHEN** the user disconnects
- **THEN** the WAHA session is logged out and the page returns to the pairing state

#### Scenario: WAHA failure is reported
- **WHEN** a WAHA call fails or WAHA is unreachable
- **THEN** the action fails with an error the page shows

### Requirement: WAHA is only reachable with its API key

The WAHA service SHALL require its API key on every request, SHALL NOT be published through the public entrypoint, and the key SHALL be known only to the WAHA service and the web application's server.

#### Scenario: Request without the key is refused
- **WHEN** a request without the correct API key reaches WAHA
- **THEN** WAHA rejects it

#### Scenario: Browser never sees the key
- **WHEN** the start page is served to a browser
- **THEN** neither the key nor the WAHA address is part of the response

## MODIFIED Requirements

### Requirement: The page reaches WhatsApp from the web application

The start page's WhatsApp server actions SHALL call the WAHA service directly from inside the web application for the signed-in user, so WAHA and its API key are never reached by the browser and no companion service sits in between.

#### Scenario: WhatsApp calls are proxied
- **WHEN** the start page loads chats, messages or performs a WhatsApp action
- **THEN** the web application calls WAHA for the signed-in user

#### Scenario: A request without a session is refused
- **WHEN** a WhatsApp action is invoked without a valid session carrying the start page application
- **THEN** it is rejected and WAHA is not called
