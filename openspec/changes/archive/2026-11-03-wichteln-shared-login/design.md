# Design

## Context

`services/wichteln` keeps everything about a participant in one `wichteln_users` row with `group_id`: name, `password_hash`, wish and `selected_wish_of`. Names are unique per group (`wichteln_users_group_name_idx`). The session cookie is `{ role: 'user', groupId, userId }`. `/wunsch` reads the group from the session. Sign-in happens only on `/g/<token>` (`groupLogin`), and the start page form (`login`) accepts only the administrator. `lib/matching.ts` works on `group.users[].id` / `selectedWishOf`. Migrations are plain SQL files in `db/`, applied in order by `lib/migrate.ts`. See proposal.md for the motivation. The user decided three points: wipe the existing data, join automatically through invite links, and let the reset password sign in, followed by a forced change.

## Goals / Non-Goals

**Goals:**
- One account row per person. Group membership, wish and selection stay per group.
- Keep matching, phases and admin progress logic unchanged. They keep operating on per-group participant ids.

**Non-Goals:**
- Self-registration on the start page (registration stays invite-only), account deletion, renaming accounts, an admin view of accounts across groups.
- Asking for the current password on change (explicitly not wanted), password-reset by e-mail.
- Migrating existing data (wiped by decision).

## Decisions

### Data model: `wichteln_accounts` + `wichteln_participants` (migration `003_accounts.sql`)

The migration deletes all groups, drops `wichteln_users`, and creates two tables:
- `wichteln_accounts(id UUID PK, name TEXT, password_hash TEXT, must_change_password BOOLEAN NOT NULL DEFAULT false, created_at)` with a unique index on `lower(name)`.
- `wichteln_participants(id UUID PK, group_id → groups ON DELETE CASCADE, account_id → accounts ON DELETE CASCADE, wish_title, wish_description, selected_wish_of → participants(id) ON DELETE SET NULL, created_at)`. It has a unique `(group_id, account_id)`, the existing wish check and the partial unique `(group_id, selected_wish_of)`.

The participant (membership) id keeps the role the old user id had, so `matching.ts`, `selectWish`, `startSelection` and the admin pages only change where they read the name. That name now comes from a join on the account. *Alternative:* add `account_id` to `wichteln_users` and drop its name/password columns. That keeps a misleading table name and a half-migrated shape. Because the data is wiped anyway, a clean drop-and-create costs nothing.

### Session `{ role: 'user', accountId }`

The cookie carries only the account. The group comes from the URL. `requireAccount()` loads the account and redirects to `/` if the account is missing or the cookie has the old shape (no `accountId`), so old cookies simply act as signed out. `requireParticipant(groupId)` additionally loads the membership and redirects to `/` (the overview) when the account is not a member of that group. Both redirect to `/passwort` while `must_change_password` is set. The server actions `saveWish`/`selectWish` take the `groupId` from a hidden form field and go through the same guard, so the forced change cannot be bypassed via actions.

### Routes

- `/`: shows the shared sign-in form when signed out. A signed-in admin goes to `/admin`. A signed-in participant goes to `/passwort` if a change is pending, to `/gruppen/<id>` with exactly one group, and otherwise sees the overview (group names linking to `/gruppen/<id>`, or a hint when there are none). The overview lives on `/` itself rather than on a separate route, so "go to the main page" always does the right thing.
- `/gruppen/[groupId]`: the former `/wunsch` page, now per group, with links to the overview (only when there is more than one group), "Passwort ändern" and logout. `/wunsch` is removed.
- `/g/[token]`: a signed-out visitor sees sign-in and register. A signed-in member is redirected to `/gruppen/<id>`. A signed-in non-member is joined during the wish phase and then redirected. In the selection phase they see a notice with a link to `/`.
- `/passwort`: a form with the new password entered twice. In the forced case it shows an explanation and hides the other navigation.

### Sign-in flows reuse the invite page

`login` (start page) checks the admin credentials first and otherwise calls `authenticateAccount`, then redirects to `/`. `groupLogin` (invite page) authenticates the same way and redirects to `/g/<token>`. That page performs the join or shows the selection-phase notice. Because both flows go through the page logic, joining happens in exactly one place. If a change is pending, either redirect lands on `/passwort` with `?weiter=<path>`. `weiter` is accepted only if it matches `^/(g/[A-Za-z0-9_-]+|gruppen/<uuid>)?$`, which prevents open redirects. After a successful forced change the participant continues there. Otherwise the target is `/`.

### Joining on GET of `/g/[token]`

`joinGroup(db, groupId, accountId)` locks the group (`FOR UPDATE`, as today). It refuses outside the wish phase and inserts `ON CONFLICT (group_id, account_id) DO NOTHING`, so it is idempotent. It runs during the server render of the invite page. *Alternative:* an explicit join button, which the user rejected. A Route Handler adds no benefit, because the redirect after the join is the same.

### Registration

`register` validates via `registrationError`, which additionally rejects a name equal to the admin user name (case-insensitive) with the "taken" message. It hashes outside the transaction, as today. `registerAccount(db, groupId, name, hash)` then locks the group, checks the phase, and inserts the account and the participant in one transaction. A unique violation on `lower(name)` maps to "Dieser Name ist bereits vergeben. Falls das du bist, melde dich an." Phase is checked before the account is created, so no orphan accounts are created in the selection phase.

### Password change and reset

`changePassword(db, accountId, hash)` sets the hash and clears `must_change_password`. `resetPassword(db, groupId, participantId)` resolves the participant's account within that group, which keeps the admin action scoped to the group page. It sets a generated hash and `must_change_password = true` and returns the plain password once, as today. The admin page adds a note that the reset applies to all of the participant's groups. The minimum and maximum password lengths move from the registration check into a shared `passwordError(password, confirmation)` that both registration and change use.

### Unknown names keep constant-time behaviour

`authenticateAccount` keeps the dummy-hash check for unknown names.

## Risks / Trade-offs

- [All Wichteln data is lost on deploy] → Decided by the user. The migration comment states it. Deploy before any group of this season is started.
- [Joining on a GET could be triggered by link prefetchers or previews] → It only adds the *signed-in* account to a group whose secret link it opened, during the wish phase, and it is idempotent. No in-app `<Link>` points to `/g/…`, so Next.js prefetch never hits it.
- [Global names make "Anna" collide across unrelated groups] → The registration error suggests signing in, or picking a distinguishable name such as "Anna M.". Names are shown per group to the admin unchanged.
- [No current password on change: a hijacked session can take over the account] → Accepted by the user for simplicity. The cookie is httpOnly, sameSite=lax and signed, and its lifetime stays unchanged.
- [Admin name and participant name could be confused on the shared form] → Registration refuses the admin user name, and the admin check runs first.

## Migration Plan

1. Deploy normally. On first DB use, `003_accounts.sql` runs, wipes the groups and switches the schema. Existing cookies stop resolving to a user, so participants are signed out.
2. The admin recreates the groups and resends the invite links. Participants register once and join further groups by signing in on their links.
3. Rollback: revert the commit and add a migration that restores the old `wichteln_users` shape. The data created in the meantime would be lost again. The migration hash check prevents an edited `003` from being silently re-applied.
