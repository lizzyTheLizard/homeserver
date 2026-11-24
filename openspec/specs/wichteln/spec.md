# wichteln Specification

## Purpose
Defines the standalone Wichteln app: how an administrator creates groups and shares their invite link, how participants register one account and sign in to all their groups, how participants submit wishes and pick a wish to fulfil, how the selection stays fair and anonymous, and how the app persists that state in PostgreSQL.

## Requirements

### Requirement: Administrators manage groups through invite links

The app SHALL authenticate the administrator with the configured administrator credentials and SHALL let the administrator create a group from a group name alone, copy the group's invite link, remove participants while the group is in the wish phase and delete groups.

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

- **WHEN** the administrator resets a participant's password, which is offered only on the account list and not on a group page
- **THEN** the app replaces the password of the participant's account with a newly generated one, shows the new password to the administrator once, marks the account as having to change its password, and the previous password no longer signs in to any group

#### Scenario: Deleting a group removes its data

- **WHEN** the administrator deletes a group
- **THEN** the group, its memberships, their wishes and their selections are removed, its invite link stops working, and the participants' accounts and other groups stay unchanged

### Requirement: Administrators reset any account's password from the account list

The app SHALL show the administrator a list of every account, including accounts that belong to no group, and SHALL let the administrator reset the password of any listed account there. Group pages SHALL offer no password reset.

#### Scenario: Account list shows all accounts

- **WHEN** the administrator opens the account list
- **THEN** the app lists every account by name, ordered by name ignoring case, together with the names of the groups the account belongs to, and shows no wish text and no password

#### Scenario: Account without a group is listed

- **WHEN** an account belongs to no group, because it was removed from all its groups or its groups were deleted
- **THEN** the account still appears in the account list, marked as belonging to no group

#### Scenario: Password is reset from the account list

- **WHEN** the administrator resets an account's password from the account list
- **THEN** the app replaces the account's password with a newly generated one, shows the new password to the administrator once, marks the account as having to change its password, and the previous password no longer signs in to any group

#### Scenario: Group pages offer no reset

- **WHEN** the administrator or an owner opens a group's management page
- **THEN** the page offers no password reset

#### Scenario: Account list is reachable from the administrator area

- **WHEN** the administrator opens the administrator overview
- **THEN** the app offers a link to the account list

#### Scenario: Account list is only for the administrator

- **WHEN** a visitor who is not signed in as administrator opens the account list or triggers a reset from it
- **THEN** the app shows no account data and resets no password

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

The app SHALL show every signed-in participant an overview on the start page, independent of how many groups the account belongs to or owns. The overview SHALL list first the groups the account participates in and then the groups the account owns, and SHALL offer a form to create a new group.

#### Scenario: Exactly one group

- **WHEN** a signed-in participant whose account belongs to exactly one group opens the start page or signs in there
- **THEN** the app shows the overview, not that group's page, and choosing the group's name opens its page

#### Scenario: Several groups

- **WHEN** a signed-in participant whose account belongs to several groups opens the start page or signs in there
- **THEN** the app shows an overview that lists only each participating group's name, and choosing a name opens that group's page

#### Scenario: Owned groups

- **WHEN** a signed-in participant who owns groups opens the start page
- **THEN** the app lists the owned groups by name after the participating groups, and choosing a name opens that group's management page

#### Scenario: Owner who participates sees the group twice

- **WHEN** a signed-in participant owns a group and also participates in it
- **THEN** the group appears in the list of participating groups, linking to the group page, and in the list of owned groups, linking to the management page

#### Scenario: No group

- **WHEN** a signed-in participant whose account belongs to no group and owns none opens the start page or signs in there
- **THEN** the app shows an overview with empty lists that tells them to join a group through an invite link or to create a group, and offers the form to create a group

#### Scenario: Create form is always offered

- **WHEN** a signed-in participant opens the start page
- **THEN** the app shows the form "Neue Gruppe erstellen"

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

- **WHEN** the administrator reloads the account list after a password reset
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

### Requirement: Participants create and own groups

The app SHALL let every signed-in participant create a group from a group name alone on the start page. The creating account SHALL become the group's owner. A group SHALL have at most one owner, and a group MAY have none.

#### Scenario: Participant creates a group

- **WHEN** a signed-in participant submits a group name on the start page
- **THEN** the group is created in the wish phase with no participants, the account is its owner, and the app opens the group's management page showing its invite link

#### Scenario: Group without a name is rejected

- **WHEN** a participant submits an empty group name
- **THEN** the app reports the problem and creates nothing

#### Scenario: Owner is not a participant by default

- **WHEN** a participant creates a group
- **THEN** the owner is not a participant of it until they add themselves

#### Scenario: Participant who must change the password cannot create groups

- **WHEN** a participant who must change their password submits a group name
- **THEN** the app creates nothing and sends them to the change-password page

### Requirement: Owners manage their groups

The app SHALL let the owner of a group open its management page and, for that group only, copy the invite link, remove participants during the wish phase, start the selection phase and delete the group, with the same rules and effects as for the administrator. Owners SHALL see progress only, never wish contents. Resetting passwords SHALL remain reserved to the administrator and be offered only on the account list.

#### Scenario: Owner opens the management page

- **WHEN** the owner opens the management page of a group they own
- **THEN** the app shows the group name, phase, invite link, each participant with whether their wish or selection is done, and the actions to remove participants, start the selection phase and delete the group, and shows no wish text and no password

#### Scenario: Owner manages the group like the administrator

- **WHEN** the owner removes a participant in the wish phase, starts the selection phase, or deletes the group
- **THEN** the app applies the same rules and results as for the administrator, including refusing removal in the selection phase and refusing to start without at least two participants who all have a wish

#### Scenario: Owner cannot reset passwords

- **WHEN** an owner looks at the management page or triggers a password reset
- **THEN** the app offers no password reset and resets no password

#### Scenario: Other groups are not reachable

- **WHEN** a participant opens the management page of a group they do not own, or triggers a management action for it
- **THEN** the app shows no data of that group, performs nothing and returns them to their group overview

#### Scenario: Owner is subject to a forced password change

- **WHEN** an owner who must change their password opens a management page or triggers a management action
- **THEN** the app performs nothing and sends them to the change-password page

### Requirement: Owners can join and leave their own group

The app SHALL let the owner of a group add their own account to the group as a participant and remove it again from the management page, during the wish phase only. Doing so SHALL NOT change the ownership.

#### Scenario: Owner adds themselves

- **WHEN** the owner chooses to participate on the management page during the wish phase
- **THEN** the account becomes a participant without a wish, and the group appears in the owner's list of participating groups as well as in their list of owned groups

#### Scenario: Owner removes themselves

- **WHEN** the owner who participates chooses to leave on the management page during the wish phase
- **THEN** the participation and the owner's wish in that group are removed, the account and its other groups stay unchanged, and the owner still owns the group

#### Scenario: Selection phase freezes participation

- **WHEN** the owner tries to add or remove themselves as a participant after the selection phase has started
- **THEN** the change is refused

### Requirement: The management page explains how a group works

The management page of a group SHALL show a short explanation of the two phases, how to add participants and how to remove them, for owners and for the administrator.

#### Scenario: Explanation is shown

- **WHEN** an owner or the administrator opens a group's management page
- **THEN** the page explains that phase 1 collects wishes and phase 2 lets participants choose a wish, that participants are added by sending them the invite link (registering or signing in there during phase 1), that they can be removed individually during phase 1 only, and that starting phase 2 closes registration and wishes

### Requirement: The administrator assigns group owners

The app SHALL let the administrator assign any existing account as the owner of any group, replace the owner, and clear the owner, from the group's management page. Assigning an owner SHALL NOT change participants, wishes or selections.

#### Scenario: Administrator assigns an owner

- **WHEN** the administrator chooses an account as owner of a group, including a group without an owner
- **THEN** that account becomes the owner, sees the group in their list of owned groups and can manage it, and the previous owner, if any, no longer can

#### Scenario: Administrator clears the owner

- **WHEN** the administrator removes the owner of a group
- **THEN** the group has no owner and only the administrator manages it

#### Scenario: Group list shows the owner

- **WHEN** the administrator opens the group overview or a group's management page
- **THEN** the app shows each group's owner by account name, or marks the group as without an owner

#### Scenario: Owner assignment is only for the administrator

- **WHEN** a visitor who is not signed in as administrator, including the group's owner, triggers the assignment of an owner
- **THEN** the app changes no owner

### Requirement: Existing groups are preserved without an owner

The app SHALL keep every group, account, membership, wish and selection that existed before group ownership was introduced, SHALL give those groups no owner, and SHALL let only the administrator manage them until an owner is assigned.

#### Scenario: Upgrade keeps all data

- **WHEN** the service starts with the ownership migration against a database that contains groups, accounts, memberships, wishes and selections
- **THEN** all of them are still present afterwards, unchanged, and every existing group has no owner

#### Scenario: Group without an owner is managed by the administrator

- **WHEN** the administrator opens a group without an owner
- **THEN** the app offers the same management as for any group, and the group appears in no participant's list of owned groups
