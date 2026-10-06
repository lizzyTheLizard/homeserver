# Spec Delta

## Purpose

Defines the CoEditor area of the web application: its editor, history and settings pages, and the behavior they share.

## ADDED Requirements

### Requirement: CoEditor provides an editor, a history and settings page

CoEditor SHALL provide an editor page, a history page and a settings page, reachable from the application's navigation.

#### Scenario: Navigation offers the three pages
- **WHEN** a signed-in user opens the CoEditor navigation
- **THEN** Editor, History and Settings are offered and open the respective CoEditor page

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

### Requirement: CoEditor is per-user

CoEditor SHALL be available to every signed-in user and SHALL keep each user's templates, profiles and discussions separate from every other user's.

#### Scenario: Every signed-in user has CoEditor
- **WHEN** a signed-in user opens the CoEditor navigation
- **THEN** the editor, history and settings pages are available

#### Scenario: CoEditor data is per user
- **WHEN** a user views or changes templates, profiles or discussions
- **THEN** only their own records are read or written
