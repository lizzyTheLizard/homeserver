## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Participant passwords are never stored or shown in readable form

The app SHALL store account passwords only as salted one-way hashes, SHALL verify sign-ins against the hash, and SHALL NOT display a password anywhere except the newly generated password shown once to the administrator after a reset.

#### Scenario: Stored password is not readable

- **WHEN** an account is registered, its password is changed or its password is reset
- **THEN** the database holds only a salted hash of the password, and two accounts with the same password have different stored values

#### Scenario: Reset password is shown only once

- **WHEN** the administrator reloads the account list after a password reset
- **THEN** the generated password is no longer shown
