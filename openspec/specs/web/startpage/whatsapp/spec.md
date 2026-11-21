# web/startpage/whatsapp Specification

## Purpose

Defines the WhatsApp area of the start page: pairing the account, listing chats, reading and replying to messages and archiving chats, driven by the web application through the WAHA service.

## Requirements

### Requirement: The page pairs the account by QR code

While the WhatsApp account is not paired, the page SHALL show a QR code to scan together with the instructions for linking a device.

#### Scenario: QR code is shown when pairing is needed
- **WHEN** the account needs authentication
- **THEN** the page shows a QR code and the instructions to link a device from the phone

### Requirement: The page lists the account's chats

The page SHALL list the account's chats with their name, whether they are a group, whether they are archived and the time of their last message, and SHALL offer a search that keeps the chats whose values match the entered text case-insensitively.

#### Scenario: Chats are listed with their state
- **WHEN** the account is connected
- **THEN** the chats are listed with name, group flag, archived flag and last-message time

#### Scenario: Search filters the chats
- **WHEN** the user enters text into the search
- **THEN** only chats whose values contain that text, ignoring case, remain listed

### Requirement: A chat opens its messages and can be replied to or archived

Selecting a chat SHALL show that chat's messages, SHALL let the user send a plain-text reply, and SHALL let the user toggle the chat's archived state.

#### Scenario: Chat messages are shown
- **WHEN** the user selects a chat
- **THEN** that chat's messages are loaded and shown, most recent at the bottom

#### Scenario: Sending a reply
- **WHEN** the user sends a non-empty reply in a chat
- **THEN** the message is sent to that chat and the chat's messages are reloaded

#### Scenario: Sending is disabled without text
- **WHEN** the reply is empty or whitespace-only
- **THEN** the send control is disabled

#### Scenario: Archiving and unarchiving
- **WHEN** the user toggles the chat's archived state
- **THEN** the chat is archived or unarchived accordingly and the list is refreshed

### Requirement: The page follows the connection status

While the account is not connected, the page SHALL poll the connection status every second until it changes and then reload the data, and it SHALL report a closed connection and a failed action to the user.

#### Scenario: Status changes refresh the page
- **WHEN** the connection status changes while the page is open
- **THEN** the page reloads the current data

#### Scenario: Closed connection is reported
- **WHEN** the WhatsApp connection is closed
- **THEN** the page reports that the connection is closed

#### Scenario: Action failure is reported
- **WHEN** a send, archive, sync or disconnect action fails
- **THEN** the page shows the error

### Requirement: The page reaches WhatsApp from the web application

The start page's WhatsApp server actions SHALL call the WAHA service directly from inside the web application for the signed-in user, so WAHA and its API key are never reached by the browser and no companion service sits in between.

#### Scenario: WhatsApp calls are proxied
- **WHEN** the start page loads chats, messages or performs a WhatsApp action
- **THEN** the web application calls WAHA for the signed-in user

#### Scenario: A request without a session is refused
- **WHEN** a WhatsApp action is invoked without a valid session carrying the start page application
- **THEN** it is rejected and WAHA is not called

### Requirement: Each user has their own WAHA session

The web application SHALL use one WAHA session per signed-in user, named deterministically from the user's identity, SHALL create and start it on first use, and SHALL never read or act on another user's session.

#### Scenario: First use creates the user's session
- **WHEN** a user opens the WhatsApp area for the first time
- **THEN** a WAHA session for that user is created and started and the page shows its QR code

#### Scenario: Users are isolated
- **WHEN** two users use WhatsApp
- **THEN** each sees only the chats and messages of their own session

### Requirement: WAHA's session state maps to the connection status

The web application SHALL report WAHA's session state as needing authentication with the current QR code while it waits for a scan, as connected while it works, as starting while the session is starting, and as closed when the session is stopped, missing or failed.

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

### Requirement: Send, archive and disconnect act through WAHA

The web application SHALL send a text message, archive or unarchive a chat, and disconnect by logging the session out, each through WAHA's API for the user's own session, and SHALL surface a failed WAHA call as an error.

#### Scenario: Message is sent through WAHA
- **WHEN** the user sends a reply
- **THEN** WAHA sends the text to that chat from the user's session

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

### Requirement: The page offers a disconnect

The page SHALL offer to disconnect the account and SHALL NOT offer a full sync.

#### Scenario: Account is disconnected
- **WHEN** the user activates disconnect
- **THEN** the account is disconnected and the page returns to the pairing state

#### Scenario: No full sync is offered
- **WHEN** the account is connected
- **THEN** the page offers disconnect and no full sync
