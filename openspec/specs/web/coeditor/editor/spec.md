# web/coeditor/editor Specification

## Purpose

Defines the CoEditor editor page: composing and revising a discussion text with predefined and custom AI commands, choosing the context template that grounds a command, and the editor's undo, redo and new controls.

## Requirements

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

### Requirement: The editor requires a complete context before running commands

The editor SHALL let the user choose a language, one of that language's templates and values for the template's parameters, and SHALL keep the editor's command controls disabled until every declared parameter has a non-blank value.

#### Scenario: Command controls disabled for an incomplete context

- **WHEN** the selected template declares a parameter whose value is missing or blank
- **THEN** the editor's command controls are disabled

#### Scenario: Command controls enabled for a complete context

- **WHEN** every parameter of the selected template has a non-blank value
- **THEN** the editor's command controls are enabled

#### Scenario: Changing the template resets the parameter values

- **WHEN** the user selects a different template
- **THEN** the parameter values are cleared and the context is re-evaluated

### Requirement: A template parameter value must be supplied

The editor SHALL substitute every parameter declared in the template text with the value the user supplied, and SHALL reject a command whose context is missing a declared parameter value instead of substituting nothing.

#### Scenario: Missing parameter value rejects the command

- **WHEN** a command is executed while a parameter declared in the template text has no supplied value
- **THEN** the command fails with an error naming the missing parameter

### Requirement: Executing a command replaces the text and saves the discussion

Executing a command SHALL send the composed text, the command and the rendered context to the AI, SHALL replace the editor's text with the returned text and the discussion's title with the returned title, and SHALL persist the discussion together with a record of the command.

#### Scenario: Successful command updates and saves the discussion

- **WHEN** the user executes a command on a discussion
- **THEN** the editor shows the returned text, the discussion is saved with the returned title, and the command is recorded

#### Scenario: A failing command leaves the text unchanged

- **WHEN** the AI or the command execution fails
- **THEN** the editor keeps the current text and reports the failure

### Requirement: A command is either a custom command or a predefined command

Every executed command SHALL carry exactly one instruction: a custom command the user typed, or one of the predefined commands. The custom command SHALL take precedence when both are present, and a command with neither SHALL be rejected.

#### Scenario: Custom command takes precedence

- **WHEN** a custom command and a predefined command are both supplied
- **THEN** the custom command is executed

#### Scenario: No instruction is rejected

- **WHEN** neither a custom command nor a predefined command is supplied
- **THEN** the command is rejected with an error

### Requirement: A new discussion is initialized automatically

When the editor opens without a discussion and with an empty text, the editor SHALL initialize a discussion from the context once the context is complete and at least one parameter is set, so the user starts from a draft rather than an empty page.

#### Scenario: Empty editor initializes from the context

- **WHEN** the editor opens without a discussion, with an empty text and a complete context having at least one parameter set
- **THEN** an initialization command runs and its draft appears in the editor

#### Scenario: Initialization does not overwrite existing text

- **WHEN** the editor already has text or an existing discussion
- **THEN** no automatic initialization runs

### Requirement: New starts a fresh discussion

The New control SHALL start a fresh discussion from the current context instead of continuing the open one, and SHALL be unavailable until the context is complete and a discussion exists.

#### Scenario: New starts a separate discussion

- **WHEN** the user activates New on a saved discussion with a complete context
- **THEN** a new discussion is created and the editor continues with it, keeping the previous discussion saved

#### Scenario: New is disabled without a context

- **WHEN** the context is incomplete
- **THEN** the New control is disabled

### Requirement: Undo and redo are client-side and reset with a new discussion

Undo and Redo SHALL step through the text versions produced in the current editing session, SHALL be available only while a respective version exists, and SHALL be reset when the user starts a new discussion.

#### Scenario: Undo steps back through text versions

- **WHEN** the user activates Undo after the text has changed
- **THEN** the editor shows the previous text version

#### Scenario: Undo and redo disable at the ends of the history

- **WHEN** there is no earlier version to undo or no later version to redo
- **THEN** the corresponding control is disabled

#### Scenario: New discards the undo history

- **WHEN** the user starts a new discussion
- **THEN** Undo and Redo are no longer available

### Requirement: The editor opens a discussion by id

The editor SHALL load the discussion named by the page's discussion id and SHALL report a missing discussion instead of opening an empty editor.

#### Scenario: Existing discussion is loaded

- **WHEN** the editor is opened with the id of one of the user's discussions
- **THEN** the editor shows that discussion's template, context and text

#### Scenario: Unknown discussion is reported

- **WHEN** the editor is opened with an id that does not belong to the user
- **THEN** the editor reports that the discussion could not be found
