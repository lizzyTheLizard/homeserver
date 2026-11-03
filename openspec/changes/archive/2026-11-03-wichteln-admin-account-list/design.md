# Design

## Context

See proposal.md for the motivation. Today `store.resetPassword(db, groupId, userId)` resolves the account through a `wichteln_participants` row, so it only works for accounts that are a member of the given group. `app/admin/[groupId]/page.tsx` renders `ResetPasswordForm` (client component in `app/components.tsx`, `useActionState`) per participant, bound to the `resetPassword` server action in `app/admin/actions.ts`. The generated password lives only in the action state, so a reload already hides it. All admin pages and actions are guarded by `requireAdmin()`, which redirects to `/`.

## Goals / Non-Goals

**Goals:**
- One admin page listing all accounts with a reset button, reusing the existing reset form and semantics.
- A single reset code path for the group page and the account list.

**Non-Goals:**
- Search, paging or filtering of the list (the number of accounts is small).
- Deleting or renaming accounts, or showing whether a reset is still pending.
- Any database schema change.

## Decisions

- **Route `/admin/konten`** as a server component page next to `/admin/[groupId]`. The UI is German and uses German route segments (`/gruppen`, `/passwort`). Because `konten` is a static segment, Next.js matches it before the dynamic `[groupId]` segment, so no group id can collide. Alternative: a section on `/admin` itself — rejected because the overview would grow with every account and mix two concerns.
- **Reset keyed by account id.** Replace `store.resetPassword(db, groupId, userId)` with `store.resetPassword(db, accountId)` that updates `wichteln_accounts` directly and returns the generated password, or a "Konto nicht gefunden." failure. The server action becomes `resetPassword(accountId)`; the group page binds it with `u.accountId` (already on `User`). Alternative: keep the group-scoped function and add a second one — rejected as two code paths with identical effect.
- **`store.listAccounts(db)`** returns `{ id, name, groups: string[] }[]` with one query: `wichteln_accounts` LEFT JOIN `wichteln_participants` and `wichteln_groups`, aggregating group names (`array_remove(array_agg(g.name ORDER BY lower(g.name)), NULL)`), grouped by account and ordered by `lower(a.name)`. It selects no password hash. Works in both Postgres and PGlite used in tests.
- **Reuse `ResetPasswordForm`** unchanged; its confirm text already says the reset applies to all groups of the person. For an account with no group the list shows "Keiner Gruppe zugeordnet".
- **Navigation:** a "Konten" link on `/admin` (e.g. a card "Konten" with a link "Alle Konten anzeigen"), and a "← Admin" back link on the new page, matching the group page's back link.

## Risks / Trade-offs

- [The group page reset no longer checks that the participant belongs to that group] → The action is admin-only and the admin may reset any account anyway; the effect is identical.
- [List of all accounts reveals account names that are in no group] → Visible to the administrator only, who already sees all participant names; names are not sensitive in this app.
