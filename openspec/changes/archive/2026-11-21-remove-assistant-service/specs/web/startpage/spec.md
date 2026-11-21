# Spec Delta

## MODIFIED Requirements

### Requirement: The start page opens the assistant chat

The start page SHALL open a chat conversation through the web application's own chat endpoint over HTTP, sending the user's location as the initial context, and SHALL show the assistant's streamed messages and the actions it offers, so the user can talk to the assistant without leaving the page.

#### Scenario: Chat session opens with the page
- **WHEN** the start page renders for a signed-in user
- **THEN** a conversation is started and the assistant's messages stream into the chat

#### Scenario: Location is sent with the session
- **WHEN** the conversation starts
- **THEN** the user's location is sent as the initial context, falling back to a configured default when the browser provides none

#### Scenario: Offered actions are shown
- **WHEN** the assistant offers actions
- **THEN** they are shown as selectable controls and send the chosen action

## REMOVED Requirements

### Requirement: The chat reconnects after a dropped connection
**Reason**: The chat no longer holds a long-lived connection; each message is its own HTTP request, so there is nothing to reconnect.
**Migration**: See "A failed chat request is reported and can be resent" and "A discarded conversation can be restarted".

## ADDED Requirements

### Requirement: A failed chat request is reported and can be resent

When a chat request fails or is interrupted before its answer is complete, the client SHALL discard the partial answer, SHALL show an error message in the chat, and SHALL return to a usable state so the user can send again. It SHALL show that the answer is slow when no event arrives for the client's stall timeout while the assistant is answering.

#### Scenario: A failing request is reported
- **WHEN** the chat request fails or the stream ends before the end of the answer
- **THEN** the partial answer is dropped, an error message is shown and the input is usable again

#### Scenario: A stalled answer is surfaced
- **WHEN** no event arrives for the client's stall timeout while the assistant is answering
- **THEN** the client shows that the answer is slow

#### Scenario: Leaving the page cancels the request
- **WHEN** the user leaves the start page while an answer is streaming
- **THEN** the chat request is aborted

### Requirement: A discarded conversation can be restarted

When the web application reports that the conversation no longer exists, the client SHALL stop sending to it, SHALL tell the user and SHALL offer to start a new conversation.

#### Scenario: Gone conversation offers a restart
- **WHEN** the chat endpoint answers that the conversation is gone
- **THEN** the client tells the user the conversation has ended and offers to start a new one
