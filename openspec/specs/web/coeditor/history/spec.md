# web/coeditor/history Specification

## Purpose

Defines the CoEditor history page: the list of a user's discussions, how that list is searched and sorted, and how a discussion is opened in the editor.

## Requirements

### Requirement: History lists the user's discussions most recently updated first

The history page SHALL list only the signed-in user's discussions, ordered by their last update with the most recently updated first.

#### Scenario: Discussions are listed newest first
- **WHEN** the user has several discussions with different update times
- **THEN** the history lists them with the most recently updated discussion first

#### Scenario: Only the user's own discussions are listed
- **WHEN** other users have discussions
- **THEN** the history does not list them

### Requirement: History shows a discussion's title, update time, context and text

Each history entry SHALL show the discussion's title, its last-update time, its context and its text.

#### Scenario: Entry shows the discussion's fields
- **WHEN** the history renders a discussion
- **THEN** the row shows its title, last-update time, context and text

### Requirement: History search filters across all columns

The history page SHALL provide a search field that filters the listed discussions: text columns SHALL match case-insensitively anywhere in their value, date and number columns SHALL match at the start of their value, and a discussion SHALL remain listed when any column matches.

#### Scenario: Search matches any column
- **WHEN** the user enters text that appears in a discussion's title, context or text
- **THEN** that discussion remains listed

#### Scenario: Non-matching discussions are hidden
- **WHEN** the entered text appears in none of a discussion's columns
- **THEN** that discussion is not listed

### Requirement: History can be sorted by its columns

Clicking a column header SHALL sort the list by that column, in ascending order on the first click and descending on the second, and SHALL remove the sort on the third click, falling back to the most recently updated first. Selecting another column SHALL replace the active sort.

#### Scenario: Sorting by a column
- **WHEN** the user clicks a column header
- **THEN** the list is ordered ascending by that column

#### Scenario: A second click reverses the order
- **WHEN** the user clicks the same column header again
- **THEN** the list is ordered descending by that column

#### Scenario: A third click removes the sort
- **WHEN** the user clicks the same column header a third time
- **THEN** the list returns to the default order, most recently updated first

#### Scenario: Default order is by last update
- **WHEN** the history page opens
- **THEN** the list is ordered by last-update time, most recent first

### Requirement: Selecting a history entry opens its discussion in the editor

Selecting a history entry SHALL open the editor for that discussion.

#### Scenario: Row opens the editor
- **WHEN** the user selects a discussion in the history
- **THEN** the editor opens with that discussion loaded
