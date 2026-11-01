# Spec Delta

## Purpose

Defines the start page: the application's landing page that shows the current time and date and opens the assistant chat, including the chat input, and that gives access to its favorites, Microsoft and WhatsApp areas.

## ADDED Requirements

### Requirement: The start page is the application's landing page

The application's root route SHALL be the start page, which a signed-in user reaches after signing in.

#### Scenario: Root route shows the start page
- **WHEN** a signed-in user opens the application's root route
- **THEN** the start page is shown

### Requirement: The start page shows the current time and date

The start page SHALL show the current local time with seconds and the current date with weekday, and SHALL keep the time current while the page is open.

#### Scenario: Clock shows time and date
- **WHEN** the start page renders
- **THEN** the current time and the date are shown

#### Scenario: Clock keeps ticking
- **WHEN** the page stays open
- **THEN** the displayed time advances

### Requirement: The start page opens the assistant chat

The start page SHALL open a chat session against the assistant and SHALL show the assistant's streamed messages and the actions it offers, so the user can talk to the assistant without leaving the page.

#### Scenario: Chat session opens with the page
- **WHEN** the start page renders for a signed-in user
- **THEN** a chat session is opened and the assistant's messages stream into the chat

#### Scenario: Offered actions are shown
- **WHEN** the assistant offers actions
- **THEN** they are shown as selectable controls and send the chosen action

### Requirement: The chat reconnects after a dropped connection

When the chat connection drops, the client SHALL attempt to reconnect to the same session, SHALL offer a manual retry once the automatic attempts are exhausted, and SHALL return to a usable state when the connection is restored.

#### Scenario: Automatic reconnection
- **WHEN** the chat connection drops
- **THEN** the client attempts to reconnect to the same session

#### Scenario: Manual retry after exhausted attempts
- **WHEN** the automatic reconnection attempts are exhausted
- **THEN** the client offers a retry control that reconnects the session

### Requirement: The chat accepts an edited text block

When the user edits an assistant-provided text block and sends it back, the chat SHALL send the edited text to the assistant as an update of that text.

#### Scenario: Edited text is sent back
- **WHEN** the user edits a text block the assistant provided and sends it
- **THEN** the assistant receives the edited text as an update

### Requirement: The start page offers favorites, Microsoft and WhatsApp

The start page SHALL provide the favorites, Microsoft and WhatsApp areas as navigation entries, and SHALL show only the applications granted to the signed-in user.

#### Scenario: Start page areas are reachable
- **WHEN** the user opens the start page navigation
- **THEN** Favorites, Microsoft and WhatsApp are offered and open their pages

#### Scenario: Navigation follows the granted applications
- **WHEN** the session does not carry an application
- **THEN** that application's navigation entry is not shown

### Requirement: Start page access requires the start page application

Every start page server action SHALL require the signed-in session to carry the start page application.

#### Scenario: Granted user is admitted
- **WHEN** a session carrying the start page application invokes a start page action
- **THEN** the action runs

#### Scenario: Ungranted session is rejected
- **WHEN** a session without the start page application invokes a start page action
- **THEN** the request is rejected as unauthorized

### Requirement: The input accepts multiple lines

The assistant chat input SHALL accept and display multiple lines of text so users can compose multi-line messages such as pasted code or multi-paragraph text.

#### Scenario: Pasting multi-line text

- **WHEN** the user pastes text containing line breaks into the chat input
- **THEN** the input accepts it and displays all lines

#### Scenario: Inserting a line break

- **WHEN** the user inserts a line break while composing a message
- **THEN** the input keeps the line break in the composed message

### Requirement: Enter sends a non-empty message when ready

Pressing Enter SHALL send the composed message when the input is non-empty and the assistant is ready, and SHALL NOT send otherwise.

#### Scenario: Enter sends a non-empty message

- **WHEN** the user presses Enter with non-empty input while the assistant is ready
- **THEN** the message is sent and the input is cleared

#### Scenario: Enter does not send empty or whitespace-only input

- **WHEN** the user presses Enter with empty or whitespace-only input
- **THEN** no message is sent

#### Scenario: Enter does not send while the assistant is not ready

- **WHEN** the user presses Enter while the assistant is not ready
- **THEN** no message is sent

### Requirement: Modifier+Enter inserts a line break

Pressing Enter with the Ctrl, Cmd, or Shift modifier SHALL insert a line break instead of sending the message.

#### Scenario: Modifier+Enter inserts a line break

- **WHEN** the user presses Ctrl+Enter, Cmd+Enter, or Shift+Enter while composing a message
- **THEN** a line break is inserted and the message is not sent

### Requirement: The input auto-grows and scrolls internally

The input SHALL grow to fit its content up to a maximum height, then scroll internally.

#### Scenario: Input grows with content

- **WHEN** the composed content exceeds the input's initial height
- **THEN** the input grows to fit the content up to the maximum height

#### Scenario: Input scrolls beyond maximum height

- **WHEN** the composed content exceeds the maximum height
- **THEN** the input stops growing and scrolls internally

### Requirement: The send button submits the message

The send button SHALL submit the composed message and SHALL be disabled while the input is empty or whitespace-only.

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

Arrow Up and Arrow Down SHALL navigate the history of sent messages when the caret is at the start or end of the input, respectively, and SHALL otherwise move the caret within the multi-line text.

#### Scenario: Arrow Up recalls the previous message

- **WHEN** the user presses Arrow Up with the caret at the start of the input and sent messages exist in history
- **THEN** the input shows the most recent sent message

#### Scenario: Arrow Down moves forward through history

- **WHEN** the user presses Arrow Down with the caret at the end of the input after navigating back in the sent-message history
- **THEN** the input shows the next (more recent) sent message

#### Scenario: Arrow keys move the caret within the text

- **WHEN** the user presses Arrow Up or Arrow Down while the caret is not at the corresponding start or end of the input
- **THEN** the caret moves within the multi-line text and no history navigation occurs
