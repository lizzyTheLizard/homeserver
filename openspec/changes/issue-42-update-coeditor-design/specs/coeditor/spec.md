# Spec Delta

## Purpose

Defines the visual presentation of the CoEditor pages (editor, history, settings) so they render with the application's new design language and remain consistent with the rest of Gutschi.site.

## ADDED Requirements

### Requirement: CoEditor pages use the new design language
The CoEditor editor, history, and settings pages SHALL render with the application's new design language as established by the start page mockups in `design/` and implemented in `web/app/startpage/`: a white background, deep navy (`#1a1a2e`) headings and primary text, grey (`#333`, `#666`, `#888`, `#aaa`) secondary text, and the system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`).

#### Scenario: Editor page follows the new design language
- **WHEN** a user opens the CoEditor editor page
- **THEN** the page renders with a white background, navy headings and primary text, grey secondary text, and the system font stack

#### Scenario: History page follows the new design language
- **WHEN** a user opens the CoEditor history page
- **THEN** the page renders with a white background, navy headings and primary text, grey secondary text, and the system font stack

#### Scenario: Settings page follows the new design language
- **WHEN** a user opens the CoEditor settings page
- **THEN** the page renders with a white background, navy headings and primary text, grey secondary text, and the system font stack

### Requirement: CoEditor pages are visually consistent with the rest of the application
The CoEditor pages SHALL be visually consistent with the rest of the application by reusing the application's visual tokens (`--gap`, `--gap-small`, `--border-radius`) and its card-based layout, following the patterns of the implemented start page.

#### Scenario: Visual consistency across apps
- **WHEN** a user navigates from a CoEditor page to the start page
- **THEN** the overall look — typography, spacing, and card surfaces — is consistent between the two

#### Scenario: Shared components appear with application styling
- **WHEN** the editor, history, or settings pages render shared components (buttons, inputs, text areas, data table)
- **THEN** those components appear with the same styling as they do elsewhere in the application

### Requirement: CoEditor restyle preserves existing functionality
The UI restyle SHALL preserve all existing CoEditor behavior: editor command execution (improve, reformulate, summarize, extend, undo, redo, new), custom command sending, history search and row navigation, and settings profile/template management continue to work exactly as before the restyle.

#### Scenario: Editor commands unchanged
- **WHEN** a user executes an editor command after the restyle
- **THEN** the command behaves exactly as before the restyle

#### Scenario: History navigation unchanged
- **WHEN** a user opens a discussion from the history page after the restyle
- **THEN** the editor opens with that discussion exactly as before the restyle

#### Scenario: Settings management unchanged
- **WHEN** a user manages profiles or templates on the settings page after the restyle
- **THEN** the management behaves exactly as before the restyle

### Requirement: Editor page uses a two-column layout with an assistant chat
The editor page SHALL present two columns on desktop-width screens: the main column with the EditorContext and the text area on the left, and an assistant chat column on the right. On mobile-width screens the columns SHALL stack vertically and the chat column SHALL take about 25% of the height and be scrollable.

#### Scenario: Desktop layout
- **WHEN** a user opens the editor on a desktop-width screen
- **THEN** the EditorContext and text area are shown in the main column and the assistant chat is shown to the right of it

#### Scenario: Mobile layout
- **WHEN** a user opens the editor on a mobile-width screen
- **THEN** the main column and the chat column are stacked vertically and the chat takes about 25% of the height and scrolls internally

### Requirement: Editor chat shows the discussion's request/response history
The editor chat SHALL show the history of requests and responses for the discussion, mirroring the assistant chat on the start page: each executed command appears as a user request message followed by an assistant response message, built from the persisted `command` records. Executing a new command SHALL append the new request/response pair to the chat.

#### Scenario: History shown when opening a discussion
- **WHEN** a user opens an existing discussion in the editor
- **THEN** the chat shows the recorded request/response pairs of that discussion in order

#### Scenario: New execution appends to the chat
- **WHEN** a user executes a command in the editor
- **THEN** the chat appends the user request and the assistant response for that command

### Requirement: Chat proposed actions and editor controls
The editor chat SHALL offer the predefined commands Improve, Reformulate, Summarize, and Extend as proposed actions that trigger the respective commands, and SHALL provide the input bar for custom commands. The Undo, Redo, and New controls SHALL remain editor controls next to the text area rather than chat actions.

#### Scenario: Proposed action triggers a command
- **WHEN** a user clicks a proposed action in the chat
- **THEN** the corresponding predefined command is executed and its result appears in the chat and text area

#### Scenario: Custom command via chat input
- **WHEN** a user types a custom command in the chat input bar and sends it
- **THEN** the command is executed and the request and response appear in the chat

#### Scenario: Undo/Redo/New stay beside the text area
- **WHEN** a user uses the editor on any screen width
- **THEN** the Undo, Redo, and New controls are available next to the text area, not inside the chat