# Proposal

## Why

Today only the administrator can create and run Wichteln groups, so every new group depends on one person. Letting any signed-in participant create and manage their own groups removes that bottleneck while the administrator keeps full control.

## What Changes

- A group gets an optional **owner**, an account. The owner manages the group on a management page that offers what the administrator's group page offers, and password resets move off the group page entirely: they are only offered on the administrator's account list.
- Every signed-in participant can create new groups from the start page ("Neue Gruppe erstellen"); the creator becomes the owner.
- The start page no longer skips straight to the only group. Every participant sees an overview with two lists: the groups they participate in, and the groups they own (linking to the management page). A group the owner also participates in appears in both lists.
- The owner can add themselves to and remove themselves from their own group on the management page, under the usual phase rules.
- The management page shows a short explanation: the two phases, how to add participants (invite link) and how to remove them.
- The administrator still manages every group and can additionally assign, change or clear a group's owner.
- Existing groups, accounts, memberships, wishes and selections are preserved. They get no owner; only the administrator manages them until an owner is assigned.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wichteln`: adds group ownership, group creation and management by owners, owner participation, the management-page explanation and owner assignment by the administrator; changes the start page requirement so that every participant sees the overview.

## Impact

- `services/wichteln`: new migration `004` (nullable owner column on `wichteln_groups`, no data removed), `lib/store.ts` (owner, owned groups, create with owner, set owner, owner add/remove self), `lib/session.ts` (owner authorisation), start page, a new owner management page, the admin group page (owner selection), the admin actions and shared components, plus tests.
- `openspec/specs/wichteln/spec.md` via the delta spec.
- No change to other services, the database of other apps, configuration or deployment.
