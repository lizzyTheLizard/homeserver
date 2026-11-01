# web/coeditor/editor Specification

## Purpose

Defines the CoEditor editor page: composing and revising a discussion text with predefined and custom AI commands, choosing the language, template and parameter values that ground a command, editing a selection, and the editor's undo, redo and new controls.

## Requirements

### Requirement: The editor offers its commands and its command input

The editor SHALL show the text area first, then the predefined commands Improve, Reformulate, Summarize and Extend as clickable proposed actions, then the custom-command input bar with a send control. Undo, Redo and New SHALL be available as small icon controls above the text area, right-aligned, with a visible difference between their enabled and disabled states, and SHALL NOT be assistant actions.

#### Scenario: Proposed action triggers a command
- **WHEN** a user clicks a proposed action
- **THEN** the corresponding predefined command is executed and its result appears in the text area

#### Scenario: Custom command via the input bar
- **WHEN** a user types a custom command in the input bar and sends it
- **THEN** the command is executed and the result appears in the text area

#### Scenario: Undo/Redo/New as icon controls
- **WHEN** a user uses the editor
- **THEN** Undo, Redo and New are available as small icon controls above the text area, right-aligned

### Requirement: The editor requires a complete context and some text before running commands

The editor SHALL let the user choose a language, one of that language's templates and values for the template's parameters, SHALL keep the command controls disabled until every declared parameter has a non-blank value, and SHALL keep them disabled while the editor's text is empty.

#### Scenario: Command controls disabled for an incomplete context
- **WHEN** the selected template declares a parameter whose value is missing or blank
- **THEN** the editor's command controls are disabled

#### Scenario: Command controls disabled for empty text
- **WHEN** the editor's text is empty
- **THEN** the editor's command controls are disabled

#### Scenario: Command controls enabled for a complete context
- **WHEN** every parameter of the selected template has a non-blank value and the text is not empty
- **THEN** the editor's command controls are enabled

#### Scenario: Changing the template resets the parameter values
- **WHEN** the user selects a different template
- **THEN** the parameter values are cleared and the context is re-evaluated

### Requirement: A template parameter value must be supplied

The editor SHALL substitute every placeholder declared in the template text with the value the user supplied, in positional order, and SHALL reject a command whose context is missing a declared parameter value instead of substituting nothing.

#### Scenario: Missing parameter value rejects the command
- **WHEN** a command is executed while a parameter declared in the template text has no supplied value
- **THEN** the command fails with an error naming the missing parameter

#### Scenario: The rendered context is stored with the discussion
- **WHEN** a command is executed or a discussion is initialized
- **THEN** the rendered context is stored on the discussion and on the command record

### Requirement: Executing a command replaces the text and saves the discussion

Executing a command SHALL send the composed text or, when a selection is active, that selection, together with the command, the rendered context, the chosen profile and the discussion's earlier commands to the AI, SHALL replace the affected text with the returned text, SHALL set the discussion's title from the returned title and SHALL persist the discussion together with a record of the command.

#### Scenario: Successful command updates and saves the discussion
- **WHEN** the user executes a command on a discussion
- **THEN** the editor shows the returned text, the discussion is saved with the returned title and the command is recorded

#### Scenario: A failing command leaves the text unchanged
- **WHEN** the AI or the command execution fails
- **THEN** the editor keeps the current text and reports the failure

### Requirement: A command applies to the selection when one is active

When the user has selected part of the text, the editor SHALL send only the selection to the AI and SHALL splice the returned text back into the selection's place, leaving the surrounding text unchanged.

#### Scenario: Only the selection is revised
- **WHEN** the user executes a command with a selection active
- **THEN** only the selected text is sent and only it is replaced

#### Scenario: Without a selection the whole text is revised
- **WHEN** the user executes a command with no selection
- **THEN** the whole text is sent and replaced

### Requirement: A command is either a custom command or a predefined command

Every executed command SHALL carry exactly one instruction: a custom command the user typed, or one of the predefined commands. The custom command SHALL take precedence when both are present, and a command with neither SHALL be rejected.

#### Scenario: Custom command takes precedence
- **WHEN** a custom command and a predefined command are both supplied
- **THEN** the custom command is executed

#### Scenario: No instruction is rejected
- **WHEN** neither a custom command nor a predefined command is supplied
- **THEN** the command is rejected with an error

#### Scenario: An unknown predefined command is rejected
- **WHEN** a predefined command outside the supported set is supplied
- **THEN** the command is rejected with an error

### Requirement: A new discussion is initialized once its context is complete

When the editor holds an empty text and no discussion, the editor SHALL initialize a discussion from the context as soon as the context is complete and at least one parameter is set, sending an initialization command whose draft becomes the editor's text and title.

#### Scenario: Empty editor initializes from the context
- **WHEN** the editor holds no discussion and no text and the user completes the context
- **THEN** an initialization command runs and its draft appears in the editor

#### Scenario: Initialization does not overwrite existing text
- **WHEN** the editor already has text or an existing discussion
- **THEN** no automatic initialization runs

### Requirement: New starts a fresh discussion

The New control SHALL start a fresh discussion from the current context instead of continuing the open one, SHALL leave the previous discussion saved, and SHALL be unavailable until the context is complete and a discussion exists.

#### Scenario: New starts a separate discussion
- **WHEN** the user activates New on a saved discussion with a complete context
- **THEN** a new discussion is created from the current context and the editor continues with it, keeping the previous discussion saved

#### Scenario: New is disabled without a context
- **WHEN** the context is incomplete
- **THEN** the New control is disabled

### Requirement: Undo and redo are client-side and reset with a new discussion

Undo and Redo SHALL step through the text versions recorded when the text changes, SHALL be available only while a respective version exists, and SHALL be reset when the user starts a new discussion.

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

The editor SHALL load the discussion named by the page's discussion id and SHALL report a missing or foreign discussion instead of opening an empty editor.

#### Scenario: Existing discussion is loaded
- **WHEN** the editor is opened with the id of one of the user's discussions
- **THEN** the editor shows that discussion's template, context and text

#### Scenario: Unknown discussion is reported
- **WHEN** the editor is opened with an id that does not belong to the user
- **THEN** the editor reports that the discussion could not be found
