# Tasks

## 1. Schema

- [x] 1.1 Add `services/wichteln/db/003_accounts.sql`. It wipes `wichteln_groups`, drops `wichteln_users`, and creates `wichteln_accounts` (unique `lower(name)`, `must_change_password`) and `wichteln_participants` (unique `(group_id, account_id)`, wish check, partial unique `(group_id, selected_wish_of)`, cascades as in design.md). Verify with `lib/migrate.tests.ts`, extended so that migrating a 002 database with data ends with empty tables in the new shape and a fresh database lists `003_accounts.sql`. Rewrite the existing 002-era assertions to apply only up to 002 where they insert into `wichteln_users`.

## 2. Store and validation

- [x] 2.1 Move the password length and confirmation rules into a shared `passwordError(password, confirmation)` in `lib/registration.ts`. Make `registrationError` additionally reject the administrator user name, case-insensitive, as taken. Verify with `lib/registration.tests.ts`.
- [x] 2.2 Rework `lib/store.ts` to the account model: participant rows join the account name, and `Group.users[].id` is the participant id. Add `authenticateAccount` (with the dummy hash kept), `registerAccount` (account plus membership in one locked transaction, phase checked first, global name conflict → taken), `joinGroup` (idempotent, wish phase only), `listAccountGroups`, `getAccount`, `findParticipant(groupId, accountId)` and `changePassword` (clears the flag). Change `resetPassword` to set the account hash and the flag. `removeParticipant`/`deleteGroup` remove memberships only. Verify with `lib/store.tests.ts`, covering: a global name conflict across groups, one account in two groups with independent wishes, joining after selection is refused, joining twice is a no-op, removal keeping the account and its other groups, reset setting the flag and invalidating the old password, change clearing the flag, and the existing matching/selection tests passing on participant ids.

## 3. Session and guards

- [x] 3.1 Change `lib/session.ts` to `{ role: 'user', accountId }`. Add `requireAccount()` (rejects the old cookie shape and unknown accounts, redirects to `/passwort` while a change is pending unless called with an allow-pending flag) and `requireParticipant(groupId)` (non-member → `/`). Add a pure helper `safeContinuePath(value)` in `lib/` that accepts only `/`, `/g/<token>` and `/gruppen/<uuid>`. Verify with a new unit test `lib/continuePath.tests.ts` covering accepted paths and rejected external or odd paths.

## 4. Pages and actions

- [x] 4.1 `app/actions.ts`: `login` handles the admin first and then accounts (→ `/`, or `/passwort?weiter=/` when a change is pending). `groupLogin` authenticates the account and redirects to `/g/<token>` (or through `/passwort?weiter=…`). `register` uses `registerAccount` and redirects to `/gruppen/<id>`. Add `changePassword`. `saveWish`/`selectWish` take `groupId` from the form and go through `requireParticipant`. `logout` → `/`. Verify by `pnpm --filter @homeserver/wichteln build` (type check) and the manual walkthrough in 5.2.
- [x] 4.2 `app/page.tsx`: the shared sign-in form for signed-out visitors, wording updated for participants. For a signed-in participant it handles the pending change, the redirect for exactly one group, and the overview with group names (or the no-group hint). Verify in the walkthrough.
- [x] 4.3 `app/g/[token]/page.tsx`: a member goes to the group, a non-member joins during the wish phase or sees the closed notice with a link to `/`, and a signed-out visitor sees sign-in plus register. The register hint text says the login works for all groups. Verify in the walkthrough.
- [x] 4.4 Move `app/wunsch/page.tsx` to `app/gruppen/[groupId]/page.tsx`, using `requireParticipant`. Pass `groupId` to `WishForm`/`WishPicker` as a hidden field. Add links to the overview (only with more than one group) and to "Passwort ändern", and point "Aktualisieren" to the group URL. Remove `/wunsch`. Verify in the walkthrough.
- [x] 4.5 Add `app/passwort/page.tsx` and a `ChangePasswordForm` in `app/components.tsx`: the new password entered twice, a forced-change explanation and no other navigation while a change is pending, and continuing to the validated `weiter` target afterwards. Verify in the walkthrough.
- [x] 4.6 `app/admin/[groupId]/page.tsx`: the reset note that it applies to all of the participant's groups and forces a change on the next sign-in. The participant names come from the accounts. Verify in the walkthrough.

## 5. Verification

- [x] 5.1 Run `pnpm --filter @homeserver/wichteln lint` and `pnpm --filter @homeserver/wichteln test`. Both pass.
- [x] 5.2 Walk through the dev app (`pnpm dev:wichteln`) against the dev DB:
  - Register on group A's link, then sign in on group B's link and land in B.
  - The start page shows the overview with A and B, and with only A it forwards directly.
  - Change the password.
  - The admin resets the password, the next sign-in is forced to `/passwort`, and after the change the participant continues to the invite group.
  - Joining B after its selection started shows the notice.
  - A non-member opening `/gruppen/<id>` is sent back to `/`.

## Workflow follow-up

- After review and commit, run `openspec-archive-change` to sync the delta into `openspec/specs/wichteln/spec.md` and open the PR.
