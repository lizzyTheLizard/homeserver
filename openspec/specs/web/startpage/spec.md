# web/startpage Specification

## Purpose

Defines the start page: the application's landing page that shows the current time and date and opens the assistant chat, including the chat input, and that gives access to its favorites, Microsoft and WhatsApp areas.

## Requirements

### Requirement: The start page is the application's landing page

The application's root route SHALL be the start page, which a signed-in user reaches after signing in, and the application navigation SHALL offer one entry per application the session carries.

#### Scenario: Root route shows the start page
- **WHEN** a signed-in user opens the application's root route
- **THEN** the start page is shown

#### Scenario: Navigation offers the granted applications
- **WHEN** the user opens the application navigation
- **THEN** one entry is offered per application the session carries, and an entry for all applications when more than one is granted

### Requirement: The start page shows the current time and date

The start page SHALL show the current time with seconds and the current date with weekday, formatted for the application's public locale, and SHALL update the time every second while the page is open.

#### Scenario: Clock shows time and date
- **WHEN** the start page renders
- **THEN** the current time and the date are shown

#### Scenario: Clock keeps ticking
- **WHEN** the page stays open
- **THEN** the displayed time advances every second

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

### Requirement: The chat accepts an edited text block

When the user edits an assistant-provided text block and sends it back, the chat SHALL send the edited text to the assistant as a normal message carrying the edited block.

#### Scenario: Edited text is sent back
- **WHEN** the user edits a text block the assistant provided and sends it
- **THEN** the assistant receives a message containing the edited text

### Requirement: The start page offers favorites, Microsoft and WhatsApp

The start page SHALL provide the favorites, Microsoft and WhatsApp areas as tabs in the start page navigation, and SHALL show only the applications granted to the signed-in user.

#### Scenario: Start page areas are reachable
- **WHEN** the user opens a start page area
- **THEN** Favorites, Microsoft and WhatsApp are offered as tabs and open their pages

#### Scenario: Navigation follows the granted applications
- **WHEN** the session does not carry an application
- **THEN** tabs leading to that application are not shown

### Requirement: Start page access requires the start page application

Every start page server action SHALL require the signed-in session to carry the start page application.

#### Scenario: Granted user is admitted
- **WHEN** a session carrying the start page application invokes a start page action
- **THEN** the action runs

#### Scenario: Ungranted session is rejected
- **WHEN** a session without the start page application invokes a start page action
- **THEN** the request is rejected

### Requirement: The input accepts multiple lines

The assistant chat input SHALL accept and display multiple lines of text so users can compose multi-line messages such as pasted code or multi-paragraph text.

#### Scenario: Pasting multi-line text
- **WHEN** the user pastes text containing line breaks into the chat input
- **THEN** the input accepts it and displays all lines

#### Scenario: Inserting a line break
- **WHEN** the user inserts a line break while composing a message
- **THEN** the input keeps the line break in the composed message

### Requirement: Enter sends a non-empty message when ready

Pressing Enter SHALL send the composed message when the input is non-empty after trimming and the assistant is ready, and SHALL NOT send otherwise. Pressing Enter with the Ctrl, Cmd or Shift modifier SHALL insert a line break instead, and a composition in progress SHALL not send.

#### Scenario: Enter sends a non-empty message
- **WHEN** the user presses Enter with non-empty input while the assistant is ready
- **THEN** the message is sent and the input is cleared

#### Scenario: Enter does not send empty or whitespace-only input
- **WHEN** the user presses Enter with empty or whitespace-only input
- **THEN** no message is sent

#### Scenario: Enter does not send while the assistant is not ready
- **WHEN** the user presses Enter while the assistant is not ready
- **THEN** no message is sent

#### Scenario: Modifier+Enter inserts a line break
- **WHEN** the user presses Ctrl+Enter, Cmd+Enter or Shift+Enter while composing a message
- **THEN** a line break is inserted at the caret and the message is not sent

### Requirement: The input auto-grows and scrolls internally

The input SHALL grow to fit its content up to a maximum height of twelve rem, then scroll internally and keep the caret in view.

#### Scenario: Input grows with content
- **WHEN** the composed content exceeds the input's initial height
- **THEN** the input grows to fit the content up to the maximum height

#### Scenario: Input scrolls beyond maximum height
- **WHEN** the composed content exceeds the maximum height
- **THEN** the input stops growing, scrolls internally and keeps the caret visible

### Requirement: The send button submits the message

The send button SHALL submit the composed message and SHALL be disabled while the input is empty or whitespace-only or the assistant is not ready.

#### Scenario: Send button submits the message
- **WHEN** the user clicks the send button with non-empty input
- **THEN** the composed message is sent

#### Scenario: Send button disabled for empty input
- **WHEN** the input is empty or whitespace-only
- **THEN** the send button is disabled

### Requirement: The input is disabled while the assistant is not ready

The chat input SHALL be disabled while the assistant is not ready.

#### Scenario: Input disabled while not ready
- **WHEN** the assistant is not ready
- **THEN** the chat input is disabled

### Requirement: Arrow keys navigate the sent-message history

Arrow Up SHALL recall the previously sent messages, most recent first, when the caret is at the start of the input, and Arrow Down SHALL walk forward again when the caret is at the end. Once history navigation has begun, further presses SHALL keep navigating regardless of the caret, and leaving the history SHALL restore the text that was being composed. Outside history navigation the arrow keys SHALL move the caret within the multi-line text.

#### Scenario: Arrow Up recalls the previous message
- **WHEN** the user presses Arrow Up with the caret at the start of the input and sent messages exist in history
- **THEN** the input shows the most recent sent message

#### Scenario: Arrow Down moves forward through history
- **WHEN** the user presses Arrow Down with the caret at the end of the input after navigating back in the sent-message history
- **THEN** the input shows the next (more recent) sent message

#### Scenario: Leaving the history restores the draft
- **WHEN** the user walks forward past the most recent recalled message
- **THEN** the text that was being composed before navigating returns

#### Scenario: Arrow keys move the caret within the text
- **WHEN** the user presses Arrow Up or Arrow Down outside history navigation and the caret is not at the corresponding start or end of the input
- **THEN** the caret moves within the multi-line text and no history navigation occurs

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
