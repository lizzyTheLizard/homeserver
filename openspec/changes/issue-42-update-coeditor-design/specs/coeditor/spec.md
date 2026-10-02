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

### Requirement: Editor offers proposed actions and a chat command input
The editor SHALL offer the predefined commands Improve, Reformulate, Summarize, and Extend as clickable proposed actions below the text area that trigger the respective commands, and SHALL provide the custom-command input bar with a send control just below the text area. Undo, Redo, and New SHALL be available as small icon controls above the text area (top-right) with a clear distinction between enabled and disabled states, and SHALL NOT be assistant actions.

#### Scenario: Proposed action triggers a command
- **WHEN** a user clicks a proposed action below the text area
- **THEN** the corresponding predefined command is executed and its result appears in the text area

#### Scenario: Custom command via the input bar
- **WHEN** a user types a custom command in the input bar below the text area and sends it
- **THEN** the command is executed and the result appears in the text area

#### Scenario: Undo/Redo/New as icon controls
- **WHEN** a user uses the editor
- **THEN** Undo, Redo, and New are available as small icon controls above the text area (top-right), with enabled and disabled states that are clearly distinguishable