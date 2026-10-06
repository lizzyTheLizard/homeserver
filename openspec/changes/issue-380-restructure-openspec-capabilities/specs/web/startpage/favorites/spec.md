# Spec Delta

## Purpose

Defines favorite management on the start page: a user's ordered list of named links, each with a URL and an optional description, which they can create, edit and delete.

## ADDED Requirements

### Requirement: A favorite is an ordered named link

A favorite SHALL belong to one user and SHALL consist of a position, a name, a URL and a description.

#### Scenario: Favorite carries its fields
- **WHEN** a favorite is created with a position, name, URL and description
- **THEN** those values are stored and shown for that user

### Requirement: Favorites are listed by position and name

The favorites page SHALL list the signed-in user's favorites ordered by position and then by name, showing the position, name, URL and description, and SHALL offer a search over the list.

#### Scenario: Favorites are ordered
- **WHEN** the user has several favorites
- **THEN** they are listed by ascending position, ties broken by name

#### Scenario: Search filters the list
- **WHEN** the user enters text into the search
- **THEN** only favorites matching the text remain listed

### Requirement: Favorite input is validated

Saving a favorite SHALL require an identifier, a whole position that is not negative, a non-blank name and a non-blank URL; the description may be empty.

#### Scenario: Blank name or URL is rejected
- **WHEN** a favorite is saved without a name or without a URL
- **THEN** the save is rejected

#### Scenario: Negative position is rejected
- **WHEN** a favorite is saved with a negative position
- **THEN** the save is rejected

### Requirement: Favorites are created, edited and deleted

The favorites page SHALL let the user create a favorite, edit an existing one and delete one after confirming the deletion.

#### Scenario: Creating and editing a favorite
- **WHEN** the user saves a favorite
- **THEN** it is stored and appears in the list

#### Scenario: Deleting a favorite
- **WHEN** the user confirms deleting a favorite
- **THEN** the favorite is removed from the list

#### Scenario: Deleting an unknown favorite is harmless
- **WHEN** a favorite that does not exist is deleted
- **THEN** the request reports success without changing anything

### Requirement: A new favorite takes the next free position

A newly created favorite SHALL default to one position past the highest position in the user's list, so it is appended to the end.

#### Scenario: New favorite is appended
- **WHEN** the user opens the form for a new favorite
- **THEN** the position defaults to the highest existing position plus one

### Requirement: Only the user's own favorites are accessible

Reading, saving and deleting favorites SHALL be limited to the signed-in user's own favorites.

#### Scenario: Another user's favorite is not modified
- **WHEN** a save or delete targets a favorite that belongs to another user
- **THEN** nothing is changed
