# Tasks

## 1. Data model and store

- [x] 1.1 Add `services/wichteln/db/004_group_owner.sql` adding nullable `owner_account_id` (FK to accounts, `ON DELETE SET NULL`, indexed) without deleting any rows. Verify: a migration test seeds groups, accounts, participants, wishes and selections with migrations 001–003, applies 004, and finds every row unchanged and all owners null.
- [x] 1.2 Extend `lib/store.ts`: `ownerAccountId`/`ownerName` on `Group`, `createGroup` with optional owner, `listOwnedGroups`, `setGroupOwner` (account must exist, `null` clears). Verify: store tests cover creation with and without owner, owned list, assigning, replacing and clearing an owner, unknown account refused.

## 2. Authorization and actions

- [x] 2.1 Add `requireGroupManager(groupId)` to `lib/session.ts` (admin for any group; user only for owned groups, with forced password change and UUID checks; otherwise redirect to `/`). Verify: tests or action tests show owner of another group, plain participant and signed-out visitor are refused.
- [x] 2.2 Create `app/verwaltung/actions.ts` with manager-authorized remove participant, start selection, delete group, plus owner join/leave own group and a user-scoped `createOwnedGroup`; keep `resetPassword` and add `setOwner` admin-only in `app/admin/actions.ts`, and remove the moved admin actions. Verify: owner cannot call `resetPassword`/`setOwner`; owner can join and leave only in the wish phase; empty name rejected.

## 3. UI

- [x] 3.1 Extract the admin group page into a shared `GroupManagement` component with the role switch (owner selection admin-only, no password reset on the page; back link and delete redirect per role; explanation block of phases, adding and removing participants; owner add/leave control), and render it at `/admin/[groupId]` and the new `/verwaltung/[groupId]`. Verify: both routes render for the right roles, no group page offers a password reset and the owner sees no owner-selection control, the explanation is visible.
- [x] 3.2 Add the owner dropdown with "Kein Besitzer" and show the owner in the admin group list. Verify: admin can assign, change and clear an owner and the list shows it.
- [x] 3.3 Rework the start page overview: remove the single-group redirect, list participating groups, owned groups (linking to `/verwaltung/<id>`, twice when also participating) and the "Neue Gruppe erstellen" form; update empty-state text. Verify: with one group the overview is shown; a participating owner sees the group in both lists.

## 4. Verification

- [x] 4.1 Update the tests (`lib/store.tests.ts`, `lib/migrate.tests.ts`) for the new behavior and run `pnpm --filter @homeserver/wichteln test`. Verify: all tests pass.
- [x] 4.2 Run `pnpm lint` and `pnpm build` for wichteln, then click through creating a group, joining/leaving as owner, admin assigning an owner and an existing ownerless group in the dev app. Verify: no lint or build errors and the flows match the delta spec scenarios.
