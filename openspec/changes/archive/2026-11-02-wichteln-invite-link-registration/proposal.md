# Proposal

## Why

Today the Wichteln administrator has to type in every participant's name and then hand out generated usernames and passwords one by one. That is tedious, and every participant ends up with a password they did not choose. Participants should instead join a group themselves through one shared invite link.

## What Changes

- **BREAKING** Creating a group takes only a group name. The administrator no longer enters participant names. Instead the group gets an invite link that the administrator copies and sends to everyone.
- New invite page per group: opening the link shows the group name and offers **Anmelden** (sign in) or **Registrieren** (register). Registering with a name and a self-chosen password creates a participant in that group, signs them in and opens their wish page. Registration is only open during the wish phase; signing in works in every phase.
- **BREAKING** Logins belong to exactly one group. A participant signs in through their group's invite link, and the same name and password do not work in another group. The start page signs in only the administrator and points participants to their invite link.
- **BREAKING** Participant passwords are stored hashed. The administrator no longer sees any password and the "copy all credentials" action goes away.
- The administrator can reset a participant's password: the app generates a new random password and shows it to the administrator once, to pass on.
- The administrator can still remove participants (wish phase only, as today), start the selection phase, see progress without wish contents, and delete groups.
- **BREAKING** The migration deletes all existing Wichteln groups, participants, wishes and selections. Existing groups do not carry over.
- Unchanged: there is still one administrator, configured through the environment. Wishes, the selection phase, the fair matching and anonymity work as before.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `wichteln`: the administrator requirement is replaced by one where group creation yields an invite link instead of a participant list; participants register and sign in per group through that link; passwords are hashed and the administrator resets them instead of reading them; the administrator view no longer shows passwords.

## Impact

- `services/wichteln/db/`: new migration that empties the Wichteln tables, adds an invite token to groups and replaces the plain-text password column with a password hash.
- `services/wichteln/lib/store.ts` (+ `store.tests.ts`): group creation without participants, lookup by invite token, registration, group-scoped sign-in, password hashing and reset. Bulk participant creation goes away.
- New `services/wichteln/lib/password.ts` (+ tests): hashing and verification with Node's built-in `crypto.scrypt`, so no new dependency.
- `services/wichteln/app/`: new invite page `app/g/[token]/`, admin-only start page, reworked admin group page (invite link, password reset, no passwords), new client forms in `components.tsx`, and actions in `actions.ts` / `admin/actions.ts`.
- `README.md`: the Wichteln description changes from "per-participant passwords" to self-registration through an invite link.
- No change to configuration, deployment or other services.
