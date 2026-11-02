# Spec Delta

## MODIFIED Requirements

### Requirement: Participants sign in with their group credentials

The app SHALL authenticate a participant only through their group's invite link, by participant name and password within that group, and SHALL issue a signed session cookie that ends on logout or expiry. A participant's credentials SHALL NOT sign them in to any other group.

#### Scenario: Valid participant credentials

- **WHEN** a participant submits, on their group's invite page, a name and password that match a participant of that group
- **THEN** the app opens the participant's wish page for that group

#### Scenario: Invalid participant credentials

- **WHEN** a participant submits, on a group's invite page, a name or password that matches no participant of that group
- **THEN** the app reports a failed sign-in and issues no session

#### Scenario: Credentials do not work in another group

- **WHEN** a participant of one group submits their name and password on another group's invite page
- **THEN** the app reports a failed sign-in and issues no session

#### Scenario: Start page does not sign in participants

- **WHEN** a visitor submits participant credentials on the start page
- **THEN** the app reports a failed sign-in and tells participants to use the invite link they received

#### Scenario: Removed participant loses access

- **WHEN** a signed-in participant has been removed from the group
- **THEN** the app ends the session and returns the visitor to the start page

### Requirement: The administrator sees progress, never wish contents

The app SHALL show the administrator, per group, only the participant names and whether each participant has submitted a wish or made a selection, and SHALL NOT show wish titles, wish descriptions or participant passwords.

#### Scenario: Progress is shown without wishes

- **WHEN** the administrator opens a group
- **THEN** the app shows each participant and whether their wish or selection is done, and shows no wish text and no password

## ADDED Requirements

### Requirement: Administrators manage groups through invite links

The app SHALL authenticate the administrator with the configured administrator credentials and SHALL let the administrator create a group from a group name alone, copy the group's invite link, remove participants while the group is in the wish phase, reset a participant's password and delete groups.

#### Scenario: Administrator signs in

- **WHEN** the administrator submits the configured administrator name and password on the start page
- **THEN** the app opens the administrator area and keeps the administrator signed in

#### Scenario: Group is created with an invite link

- **WHEN** the administrator submits a group name
- **THEN** the group is created in the wish phase with no participants, and the administrator sees an invite link for the group that can be copied in one action

#### Scenario: Group without a name is rejected

- **WHEN** the administrator submits an empty group name
- **THEN** the app reports the problem and creates nothing

#### Scenario: Participants are removed only during the wish phase

- **WHEN** the administrator removes a participant in the wish phase
- **THEN** the participant and their wish are removed from the group
- **WHEN** the administrator tries the same in the selection phase
- **THEN** the change is refused

#### Scenario: Password is reset

- **WHEN** the administrator resets a participant's password
- **THEN** the app replaces the participant's password with a newly generated one, shows the new password to the administrator once, and the participant's previous password no longer signs them in

#### Scenario: Deleting a group removes its data

- **WHEN** the administrator deletes a group
- **THEN** the group, its participants, their wishes and their selections are removed, and its invite link stops working

### Requirement: Participants register through the group's invite link

The app SHALL let a visitor of a group's invite link register for that group with a name and a self-chosen password during the wish phase, SHALL add them to that group as a participant, sign them in and open their wish page. Names SHALL be unique within a group, ignoring case.

#### Scenario: Invite page offers sign-in and registration

- **WHEN** a visitor opens a valid invite link
- **THEN** the app shows the group name and offers to sign in or to register for that group

#### Scenario: Unknown invite link

- **WHEN** a visitor opens an invite link that matches no group
- **THEN** the app shows a not-found page and offers neither sign-in nor registration

#### Scenario: Successful registration

- **WHEN** a visitor registers on a group's invite page with a name not yet used in the group and a valid password entered twice identically
- **THEN** the app adds them to that group as a participant without a wish, signs them in and opens their wish page

#### Scenario: Name already taken

- **WHEN** a visitor registers with a name that a participant of the same group already uses, in any letter case
- **THEN** the app reports that the name is taken and adds no participant

#### Scenario: Same name in another group

- **WHEN** a visitor registers with a name that is used only in a different group
- **THEN** the app accepts the registration as a new, separate participant of this group

#### Scenario: Invalid registration input

- **WHEN** the name is empty or longer than 60 characters, the password is shorter than 8 or longer than 200 characters, or the two password entries differ
- **THEN** the app reports the problem and adds no participant

#### Scenario: Registration closes when selection starts

- **WHEN** a visitor tries to register after the group's selection phase has started
- **THEN** the app refuses the registration and still offers sign-in to existing participants

### Requirement: Participant passwords are never stored or shown in readable form

The app SHALL store participant passwords only as salted one-way hashes, SHALL verify sign-ins against the hash, and SHALL NOT display a participant's password anywhere except the newly generated password shown once to the administrator after a reset.

#### Scenario: Stored password is not readable

- **WHEN** a participant registers or their password is reset
- **THEN** the database holds only a salted hash of the password, and two participants with the same password have different stored values

#### Scenario: Reset password is shown only once

- **WHEN** the administrator reloads the group page after a password reset
- **THEN** the generated password is no longer shown

## REMOVED Requirements

### Requirement: Administrators manage groups and participant credentials

**Reason**: The administrator no longer enters participant names or hands out generated credentials. Participants register themselves through the group's invite link.
**Migration**: Replaced by "Administrators manage groups through invite links" and "Participants register through the group's invite link". Existing groups are deleted by the migration.
