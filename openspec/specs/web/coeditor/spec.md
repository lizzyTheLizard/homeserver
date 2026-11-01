# web/coeditor Specification

## Purpose

Defines the CoEditor area of the web application: the editor, history and settings pages it provides and the per-user isolation of the data behind them.

## Requirements

### Requirement: CoEditor provides an editor, a history and settings page

CoEditor SHALL provide an editor page, a history page and a settings page, reachable from the application's navigation.

#### Scenario: Navigation offers the three pages
- **WHEN** a signed-in user opens the CoEditor navigation
- **THEN** Editor, History and Settings are offered and open the respective CoEditor page

### Requirement: CoEditor is per-user

CoEditor SHALL be available to every signed-in user and SHALL keep each user's templates, profiles, discussions and commands separate from every other user's.

#### Scenario: Every signed-in user has CoEditor
- **WHEN** a signed-in user opens the CoEditor navigation
- **THEN** the editor, history and settings pages are available

#### Scenario: CoEditor data is per user
- **WHEN** a user views or changes templates, profiles, discussions or commands
- **THEN** only their own records are read or written

#### Scenario: Another user's discussion is refused
- **WHEN** a user opens, continues or executes a command on a discussion that belongs to another user
- **THEN** the request is rejected and nothing of that discussion is used or changed
