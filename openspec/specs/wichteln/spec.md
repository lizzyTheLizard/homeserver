# wichteln Specification

## Purpose
Defines the standalone Wichteln app: how an administrator creates groups and hands out credentials, how participants submit wishes and pick a wish to fulfil, how the selection stays fair and anonymous, and how the app persists that state in PostgreSQL.

## Requirements

### Requirement: Administrators manage groups and participant credentials

The app SHALL authenticate the administrator with the configured administrator credentials and SHALL let the administrator create and delete groups, add or remove participants while a group is in the wish phase, and copy every participant's generated credentials.

#### Scenario: Administrator signs in

- **WHEN** the administrator submits the configured administrator name and password
- **THEN** the app opens the administrator area and keeps the administrator signed in

#### Scenario: Group is created with generated credentials

- **WHEN** the administrator submits a group name and at least two distinct participant names
- **THEN** the group is created in the wish phase, every participant receives a generated password, and the credentials can be copied in one action

#### Scenario: Invalid group is rejected

- **WHEN** the administrator submits fewer than two participants or the same participant name twice
- **THEN** the app reports the problem and creates nothing

#### Scenario: Participants change only during the wish phase

- **WHEN** the administrator adds or removes a participant in the wish phase
- **THEN** the group membership changes
- **WHEN** the administrator tries the same in the selection phase
- **THEN** the change is refused

#### Scenario: Deleting a group removes its data

- **WHEN** the administrator deletes a group
- **THEN** the group, its participants, their wishes and their selections are removed

### Requirement: Participants sign in with their group credentials

The app SHALL authenticate a participant by participant name and password within a group and SHALL issue a signed session cookie that ends on logout or expiry.

#### Scenario: Valid participant credentials

- **WHEN** a participant submits a name and password that match a participant
- **THEN** the app opens the participant's wish page for that group

#### Scenario: Invalid participant credentials

- **WHEN** a participant submits a name or password that matches no participant
- **THEN** the app reports a failed sign-in and issues no session

#### Scenario: Removed participant loses access

- **WHEN** a signed-in participant has been removed from the group
- **THEN** the app ends the session and returns the visitor to the sign-in page

### Requirement: The administrator sees progress, never wish contents

The app SHALL show the administrator, per group, only whether each participant has submitted a wish or made a selection, together with participant names and passwords, and SHALL NOT show wish titles or descriptions.

#### Scenario: Progress is shown without wishes

- **WHEN** the administrator opens a group
- **THEN** the app shows each participant and whether their wish or selection is done, and shows no wish text

### Requirement: Wishes are collected during the wish phase

The app SHALL let a participant submit and change a wish consisting of a title and a description until the selection phase starts, and SHALL reject empty wishes or text over the configured limits.

#### Scenario: Wish is saved

- **WHEN** a participant submits a title and a description within the limits
- **THEN** the app stores the wish and confirms it

#### Scenario: Wish can be changed before selection

- **WHEN** a participant changes a wish while the group is still in the wish phase
- **THEN** the app replaces the stored wish

#### Scenario: Wish is rejected

- **WHEN** the title or description is empty or exceeds its length limit
- **THEN** the app reports the problem and keeps the previous wish

#### Scenario: Wishes are frozen once selection starts

- **WHEN** a participant submits or changes a wish after the selection phase has started
- **THEN** the app refuses the change

### Requirement: The administrator starts the selection phase

The app SHALL start the selection phase only when the group has at least two participants and every participant has submitted a wish, and SHALL keep the phase unchanged otherwise.

#### Scenario: Selection starts when every wish exists

- **WHEN** the administrator starts the selection phase and every participant of a group with at least two participants has a wish
- **THEN** the group moves to the selection phase and wishes become read-only

#### Scenario: Selection cannot start early

- **WHEN** a participant has no wish or the group has fewer than two participants
- **THEN** the app refuses to start the selection phase and reports what is missing

### Requirement: Selection never leaves a participant with their own wish

The selection phase SHALL offer a participant only wishes that are not their own, not already chosen, and whose choice still lets every remaining participant receive someone else's wish; a selection SHALL be final.

#### Scenario: Only safe wishes are offered

- **WHEN** a participant opens the selection page
- **THEN** the app offers only wishes that keep a complete assignment of foreign wishes possible

#### Scenario: Own wish is never offered

- **WHEN** a participant opens the selection page
- **THEN** their own wish does not appear

#### Scenario: Selection is final

- **WHEN** a participant chooses an offered wish
- **THEN** the app records the choice, shows the chosen wish, and refuses any further choice

#### Scenario: Stale or duplicated choice is refused

- **WHEN** a participant chooses a wish that another participant already chose or that is no longer safe to choose
- **THEN** the app refuses the choice and asks them to pick again

#### Scenario: No wish is selectable

- **WHEN** no wish is currently selectable for a participant
- **THEN** the app tells them to contact the administrator instead of offering a wish

### Requirement: Wishes are anonymous to participants

The selection page SHALL show only wish titles and descriptions and SHALL NOT reveal which participant a wish belongs to.

#### Scenario: Owner is not shown

- **WHEN** a participant views the selectable wishes
- **THEN** no participant name or other owner identifier is shown next to a wish

### Requirement: State is persisted in PostgreSQL

The app SHALL store every group, participant, wish and selection in its PostgreSQL database, SHALL apply its schema migrations at startup, and SHALL require no filesystem writes for application state or secrets.

#### Scenario: State survives a redeploy

- **WHEN** the service's container is re-created or redeployed
- **THEN** all groups, participants, wishes and selections are still available

#### Scenario: Schema is up to date at startup

- **WHEN** the service starts against an empty or older database
- **THEN** it applies the pending migrations before serving requests

#### Scenario: Concurrent writes stay consistent

- **WHEN** two participants change their wishes or choose a wish at the same time
- **THEN** the app applies the changes without losing one of them and without assigning the same wish twice

### Requirement: The app fails closed on missing configuration

The app SHALL require an administrator password, a session secret and a database connection from the environment and SHALL NOT start serving with a default or missing value.

#### Scenario: Missing configuration blocks the service

- **WHEN** the administrator password, session secret or database connection is missing or empty
- **THEN** the service reports unhealthy and does not serve application pages

#### Scenario: Configuration comes from the environment

- **WHEN** the service runs
- **THEN** the administrator credentials, the session secret and the database connection are read from its environment, not from files it created
