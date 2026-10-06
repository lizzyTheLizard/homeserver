# Spec Delta

## Purpose

Defines cash projects: the books a user keeps, how they are listed in the cash application, and how an administrator creates, changes and deletes them across users.

## ADDED Requirements

### Requirement: A cash project names a user's books

A cash project SHALL consist of a name, an archived flag and its owning user, and SHALL NOT carry any further settings such as a currency or a fiscal year.

#### Scenario: Project has no own settings

- **WHEN** a cash project is displayed or edited
- **THEN** only its name, its owner and its archived flag are configurable

### Requirement: The cash application lists the user's projects read-only

The cash project list SHALL show a card per project owned by the signed-in user, archived projects included, and SHALL open a project's journal when its card is selected. The cash application itself SHALL NOT create, edit or delete projects.

#### Scenario: Project cards open the journal

- **WHEN** the user selects a project card
- **THEN** that project's journal opens for the default period

#### Scenario: Archived projects stay listed

- **WHEN** the project list renders
- **THEN** archived projects are shown as well

### Requirement: Deleting a project deletes its books

Deleting a cash project SHALL also remove its accounts, transactions, ledger entries, closings and monthly closings.

#### Scenario: Project deletion cascades

- **WHEN** a project that has accounts and transactions is deleted
- **THEN** the project and all of its books are gone

