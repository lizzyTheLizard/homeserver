# Proposal

## Why

In Wichteln, a participant record belongs to exactly one group. Someone in several groups needs a separate name and password for each one, and they can only sign in through that group's invite link. People should have one login that works for all their groups, and they should be able to change their password themselves, including the password the administrator generates on a reset.

## What Changes

- **BREAKING** Participants get one account (name + password) for all their groups. Account names are unique across the whole app, ignoring case. All existing groups, participants, wishes and selections are deleted by the migration, as with the invite-link migration before.
- Invite link: a visitor can sign in with an existing account or register a new one. Either way the account joins the group during the wish phase and the group page opens. A visitor who is already signed in joins and goes to the group straight away.
- Start page: participants can now sign in there too, with the same form the administrator uses. After sign-in, a participant with exactly one group goes straight to that group. With several groups they see an overview that lists only the group names, each linking to its group. With no group they see a hint to use an invite link.
- New "change password" page for signed-in participants: they enter the new password twice, and no current password is asked.
- An administrator reset now resets the account's password, so it applies to all the account's groups. The generated password still signs in, but every page then sends the participant to "change password" until they set a new one.
- When the administrator removes a participant or deletes a group, only the group membership goes away. The account stays and keeps working for its other groups.
- Registration refuses the administrator's user name, so a sign-in on the shared form is never ambiguous.

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `wichteln`: participant sign-in and registration move from per-group credentials to one account across groups, and a group overview is added. Password change and the forced change after an administrator reset are added. Reset, removal and group deletion now act on the account or the membership. Persistence now includes accounts.

## Impact

- `services/wichteln/db/`: new migration `003`. It wipes the groups and introduces an accounts table plus a membership table that holds the wish and the selection.
- `services/wichteln/lib/store.ts`, `lib/session.ts`, `lib/registration.ts`: the account model, a session keyed on the account, and the forced-password-change guard. Their tests change accordingly.
- `services/wichteln/app/`: the start page (shared sign-in and overview), the invite page (join flow), group pages under `/gruppen/<id>` replacing `/wunsch`, the new `/passwort` page, server actions, the admin group page (reset wording) and the client forms in `components.tsx`.
- Existing sessions and invite-link logins stop working once this is deployed. All Wichteln data is lost, and participants must register again.
- No changes to other services, the infrastructure or the environment variables.
