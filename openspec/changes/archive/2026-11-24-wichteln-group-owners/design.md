# Design

## Context

`services/wichteln` has one admin (credentials from the environment, cookie role `admin`) and accounts (cookie role `user`). Groups live in `wichteln_groups`; an account's membership, wish and selection live in `wichteln_participants`. All group management today sits under `/admin` and is guarded by `requireAdmin()`; the start page redirects an account with exactly one group straight to it. Earlier migrations (`002`, `003`) deleted all groups; this change must not. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- One management implementation shared by administrator and owner, so both stay identical in behavior.
- A nullable owner that needs no data backfill and cannot break existing groups.

**Non-Goals:**

- Several owners per group, transferring ownership by the owner, or owners resetting passwords.
- Deleting accounts (none exists today); no new notion of roles beyond owner and administrator.

## Decisions

**Owner as a column on the group.** Migration `004_group_owner.sql` adds `owner_account_id UUID REFERENCES wichteln_accounts (id) ON DELETE SET NULL` plus an index. Nullable, no default, no `DELETE`: existing groups keep all data and simply have no owner. Alternative, a separate ownership table, was rejected because there is at most one owner.

**Ownership is independent of participation.** Owner and participant are unrelated: the owner is not auto-added, and leaving does not drop ownership. The owner joins/leaves via the existing `joinGroup` rules and the existing participant removal (wish phase only), exposed as owner actions on their own account. This keeps the phase rules in one place.

**One management view, two routes.** The body of `app/admin/[groupId]/page.tsx` moves into a shared server component `GroupManagement` taking `role: 'admin' | 'owner'` and the base path. It is rendered at `/admin/[groupId]` (administrator, unchanged URL) and at a new `/verwaltung/[groupId]` (owner; the administrator may also open it). The role switches on the admin-only parts: the owner selection (the per-participant password reset leaves the group page; it stays only on the account list `/admin/konten`), and the "back" link and post-delete redirect (`/admin` vs `/`). The owner's own add/leave control is shown only to the owner, and to the administrator not at all. Alternative, duplicating the page, was rejected.

**Authorization helper.** `requireGroupManager(groupId)` in `lib/session.ts` returns `{ role, group }`: the administrator for any group; a user session only when `owner_account_id` equals the account (after the same forced-password-change redirect as `requireAccount`); otherwise redirect to `/`. All management Server Actions (remove participant, start selection, delete group) move to `app/verwaltung/actions.ts` and call it, so neither role can skip the check; `resetPassword` and `setOwner` keep `requireAdmin()`. The UUID guard from `requireParticipant` applies too. The group id always comes from the action argument and is re-checked against the session on the server.

**Store additions** (`lib/store.ts`): `Group` gets `ownerAccountId` and `ownerName`; `createGroup(db, name, ownerAccountId?)`; `listOwnedGroups(db, accountId)`; `setGroupOwner(db, groupId, accountId | null)` (checks the account exists); `listAccounts` is reused for the admin's owner dropdown. Owner add/leave reuse `joinGroup` and `removeParticipant`.

**Start page.** The single-group redirect is removed. The overview renders "Deine Gruppen" (participating), "Von dir verwaltete Gruppen" (owned, linking to `/verwaltung/<id>`) and a "Neue Gruppe erstellen" card reusing `CreateGroupForm` with a user-scoped `createOwnedGroup` action that redirects to the new management page. The admin's `createGroup` keeps creating ownerless groups.

**Explanation block.** A short static text in `GroupManagement` for both roles: phase 1 collects wishes, phase 2 lets each participant choose one wish; add people by sending the invite link (they register or sign in during phase 1); remove people individually during phase 1; starting phase 2 closes registration and wishes.

**Owner assignment UI.** On the admin view, a select of all accounts plus "Kein Besitzer" and a save button; the admin group list also shows each group's owner.

## Risks / Trade-offs

- [An owner can delete a group with all data] → same confirm dialog as for the administrator; accepted, ownership is deliberate.
- [Any participant can create unlimited groups] → accepted for a small closed home-server app; no quota in this change.
- [Admin-created accounts' names are visible in the owner dropdown] → only the administrator sees it.
- [Owner sees participants' names] → already visible to participants in the same flow; wishes stay hidden.

## Migration Plan

Startup applies `004` automatically (existing migrator). It is additive, so a rollback to the previous image keeps working because the old code ignores the column. No data migration.
