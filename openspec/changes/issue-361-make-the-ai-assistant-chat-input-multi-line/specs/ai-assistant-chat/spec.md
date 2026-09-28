# Spec Delta

## Purpose

Defines the AI assistant chat window's message-composition input: multi-line entry, Enter-to-send and modifier+Enter-to-insert-newline key handling, auto-grow with internal scroll, and the preserved send-button, disabled-while-not-ready, history-navigation, and empty-input behaviors.

## ADDED Requirements

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
