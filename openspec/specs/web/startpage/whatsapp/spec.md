# web/startpage/whatsapp Specification

## Purpose

Defines the WhatsApp area of the start page: pairing the account, listing chats, reading and replying to messages and archiving chats, driven through the assistant.

## Requirements

### Requirement: The page pairs the account by QR code

While the WhatsApp account is not paired, the page SHALL show a QR code to scan together with the instructions for linking a device.

#### Scenario: QR code is shown when pairing is needed
- **WHEN** the account needs authentication
- **THEN** the page shows a QR code and the instructions to link a device from the phone

### Requirement: The page lists the account's chats

The page SHALL list the account's chats with their name, whether they are a group, whether they are archived and the time of their last message, and SHALL offer a search over the list.

#### Scenario: Chats are listed with their state
- **WHEN** the account is connected
- **THEN** the chats are listed with name, group flag, archived flag and last-message time

#### Scenario: Search filters the chats
- **WHEN** the user enters text into the search
- **THEN** only chats matching the text remain listed

### Requirement: A chat opens its messages and can be replied to or archived

Selecting a chat SHALL show that chat's messages, SHALL let the user send a plain-text reply, and SHALL let the user toggle the chat's archived state.

#### Scenario: Chat messages are shown
- **WHEN** the user selects a chat
- **THEN** that chat's messages are loaded and shown, most recent at the bottom

#### Scenario: Sending a reply
- **WHEN** the user sends a non-empty reply in a chat
- **THEN** the message is sent to that chat and the chat's messages are reloaded

#### Scenario: Archiving and unarchiving
- **WHEN** the user toggles the chat's archived state
- **THEN** the chat is archived or unarchived accordingly and the list is refreshed

### Requirement: The page offers a full sync and a disconnect

The page SHALL offer to run a full sync of the account and to disconnect the account.

#### Scenario: Full sync is started
- **WHEN** the user activates full sync
- **THEN** a full sync is started and the page reports that it may take a while

#### Scenario: Account is disconnected
- **WHEN** the user activates disconnect
- **THEN** the account is disconnected and the page returns to the pairing state

### Requirement: The page follows the connection status

While the account is not connected, the page SHALL poll the connection status until it changes and then refresh the data, and it SHALL report a closed connection and any action failure instead of showing stale data.

#### Scenario: Status changes refresh the page
- **WHEN** the connection status changes while the page is open
- **THEN** the page reloads the current data

#### Scenario: Closed connection is reported
- **WHEN** the WhatsApp connection is closed
- **THEN** the page reports that the connection is closed

#### Scenario: Action failure is reported
- **WHEN** a send, archive, sync or disconnect action fails
- **THEN** the page shows the error without discarding the loaded data

### Requirement: The page reaches WhatsApp through the assistant

The start page SHALL reach WhatsApp through the assistant's internal API, which SHALL forward the request for the signed-in user, so the bridge is never called directly by the browser.

#### Scenario: WhatsApp calls are proxied
- **WHEN** the start page loads chats, messages or performs a WhatsApp action
- **THEN** the call goes through the assistant for the signed-in user
