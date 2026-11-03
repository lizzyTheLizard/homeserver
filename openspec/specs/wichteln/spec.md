# wichteln Specification

## Purpose
Defines the standalone Wichteln app: how an administrator creates groups and shares their invite link, how participants register one account and sign in to all their groups, how participants submit wishes and pick a wish to fulfil, how the selection stays fair and anonymous, and how the app persists that state in PostgreSQL.

## Requirements

### Requirement: Administrators manage groups through invite links

The app SHALL authenticate the administrator with the configured administrator credentials and SHALL let the administrator create a group from a group name alone, copy the group's invite link, remove participants while the group is in the wish phase, reset a participant's account password and delete groups.

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
- **THEN** the participant's membership and their wish in that group are removed, and their account and memberships in other groups stay unchanged
- **WHEN** the administrator tries the same in the selection phase
- **THEN** the change is refused

#### Scenario: Password is reset

- **WHEN** the administrator resets a participant's password
- **THEN** the app replaces the password of the participant's account with a newly generated one, shows the new password to the administrator once, marks the account as having to change its password, and the previous password no longer signs in to any group

#### Scenario: Deleting a group removes its data

- **WHEN** the administrator deletes a group
- **THEN** the group, its memberships, their wishes and their selections are removed, its invite link stops working, and the participants' accounts and other groups stay unchanged

### Requirement: Participants sign in with one account for all their groups

The app SHALL authenticate a participant by account name and password, both on the start page and on any group's invite page, and SHALL issue a signed session cookie for the account that ends on logout or expiry. The session SHALL give access only to groups the account is a member of.

#### Scenario: Sign-in on the start page

- **WHEN** a visitor submits on the start page a name and password that match an account
- **THEN** the app signs them in and continues as described for the group overview

#### Scenario: Sign-in on an invite page

- **WHEN** a visitor submits on a group's invite page a name and password that match an account
- **THEN** the app signs them in and continues as described for joining through an invite link

#### Scenario: Invalid credentials

- **WHEN** a visitor submits a name or password that matches no account and is not the administrator's
- **THEN** the app reports a failed sign-in and issues no session

#### Scenario: Group outside the account is not reachable

- **WHEN** a signed-in participant opens the page of a group their account is not a member of
- **THEN** the app shows no data of that group and returns them to their group overview

#### Scenario: Removed participant loses access to that group only

- **WHEN** a signed-in participant has been removed from a group
- **THEN** the app no longer opens that group for them, and their other groups stay reachable

### Requirement: An invite link adds the signed-in account to its group

The app SHALL add a signed-in account that opens a group's invite link, or signs in on its invite page, to that group during the wish phase and open the group page. An account that is already a member SHALL go straight to the group page.

#### Scenario: Already a member

- **WHEN** a signed-in participant opens the invite link of a group they belong to
- **THEN** the app opens that group's page

#### Scenario: Joining during the wish phase

- **WHEN** a signed-in participant who is not a member opens a group's invite link, or signs in on its invite page, while the group is in the wish phase
- **THEN** the app adds the account to the group as a participant without a wish and opens the group page

#### Scenario: Joining after selection started

- **WHEN** a signed-in participant who is not a member opens a group's invite link, or signs in on its invite page, after the selection phase has started
- **THEN** the app does not add them, tells them that joining is no longer possible, and offers the way to their group overview

### Requirement: The start page leads a participant to their groups

The app SHALL send a signed-in participant who opens the start page to their only group directly when the account belongs to exactly one group, and otherwise SHALL show an overview of the account's groups.

#### Scenario: Exactly one group

- **WHEN** a signed-in participant whose account belongs to exactly one group opens the start page or signs in there
- **THEN** the app opens that group's page

#### Scenario: Several groups

- **WHEN** a signed-in participant whose account belongs to several groups opens the start page or signs in there
- **THEN** the app shows an overview that lists only each group's name, and choosing a name opens that group's page

#### Scenario: No group

- **WHEN** a signed-in participant whose account belongs to no group opens the start page or signs in there
- **THEN** the app shows an empty overview that tells them to join a group through an invite link

### Requirement: Participants change their own password

The app SHALL let a signed-in participant set a new password for their account by entering it twice, without asking for the current password, with the same length rules as registration.

#### Scenario: Password is changed

- **WHEN** a signed-in participant submits a valid new password entered twice identically
- **THEN** the app stores the new password for the account, confirms the change, and from then on only the new password signs in

#### Scenario: Invalid new password

- **WHEN** the new password is shorter than 8 or longer than 200 characters, or the two entries differ
- **THEN** the app reports the problem and keeps the previous password

### Requirement: A reset password must be changed on the next sign-in

The app SHALL let an account whose password the administrator reset sign in with the generated password, and SHALL then allow nothing but changing the password until the participant has set a new one.

#### Scenario: Sign-in with a reset password

- **WHEN** a participant signs in with the password generated by an administrator reset
- **THEN** the app opens the change-password page instead of a group or the overview

#### Scenario: Other pages are blocked until the change

- **WHEN** a participant who must change their password opens a group page, the overview or an invite link, or submits a wish or a selection
- **THEN** the app performs nothing else and sends them to the change-password page

#### Scenario: Change completes the sign-in

- **WHEN** a participant who must change their password sets a valid new password
- **THEN** the account no longer has to change its password, and the app continues to where the sign-in would have led, the group of the invite link or their group overview

### Requirement: Participants register through the group's invite link

The app SHALL let a visitor of a group's invite link register an account with a name and a self-chosen password during the wish phase, SHALL add that account to the group, sign them in and open the group page. Account names SHALL be unique across the app, ignoring case, and SHALL NOT equal the administrator user name.

#### Scenario: Invite page offers sign-in and registration

- **WHEN** a visitor who is not signed in opens a valid invite link
- **THEN** the app shows the group name and offers to sign in with an existing account or to register a new one

#### Scenario: Unknown invite link

- **WHEN** a visitor opens an invite link that matches no group
- **THEN** the app shows a not-found page and offers neither sign-in nor registration

#### Scenario: Successful registration

- **WHEN** a visitor registers on a group's invite page with a name no account uses yet and a valid password entered twice identically
- **THEN** the app creates the account, adds it to that group as a participant without a wish, signs them in and opens the group page

#### Scenario: Name already taken

- **WHEN** a visitor registers with a name that an existing account already uses, in any letter case, or that equals the administrator user name
- **THEN** the app reports that the name is taken, suggests signing in instead, and creates no account

#### Scenario: Same name in another group

- **WHEN** a visitor registers on a group's invite page with the name of an account that so far belongs only to a different group
- **THEN** the app refuses the registration as a taken name and creates no second account, and signing in with that account on the invite page adds it to this group instead

#### Scenario: Invalid registration input

- **WHEN** the name is empty or longer than 60 characters, the password is shorter than 8 or longer than 200 characters, or the two password entries differ
- **THEN** the app reports the problem and creates no account

#### Scenario: Registration closes when selection starts

- **WHEN** a visitor tries to register after the group's selection phase has started
- **THEN** the app refuses the registration, creates no account and still offers sign-in to existing participants

### Requirement: Participant passwords are never stored or shown in readable form

The app SHALL store account passwords only as salted one-way hashes, SHALL verify sign-ins against the hash, and SHALL NOT display a password anywhere except the newly generated password shown once to the administrator after a reset.

#### Scenario: Stored password is not readable

- **WHEN** an account is registered, its password is changed or its password is reset
- **THEN** the database holds only a salted hash of the password, and two accounts with the same password have different stored values

#### Scenario: Reset password is shown only once

- **WHEN** the administrator reloads the group page after a password reset
- **THEN** the generated password is no longer shown

### Requirement: The administrator sees progress, never wish contents

The app SHALL show the administrator, per group, only the participant names and whether each participant has submitted a wish or made a selection, and SHALL NOT show wish titles, wish descriptions or participant passwords.

#### Scenario: Progress is shown without wishes

- **WHEN** the administrator opens a group
- **THEN** the app shows each participant and whether their wish or selection is done, and shows no wish text and no password

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

The app SHALL store every account, group, membership, wish and selection in its PostgreSQL database, SHALL apply its schema migrations at startup, and SHALL require no filesystem writes for application state or secrets.

#### Scenario: State survives a redeploy

- **WHEN** the service's container is re-created or redeployed
- **THEN** all accounts, groups, memberships, wishes and selections are still available

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
