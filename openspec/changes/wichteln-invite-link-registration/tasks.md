# Tasks

## 1. Schema and password hashing

- [x] 1.1 Add `services/wichteln/db/002_invite_registration.sql` (empty the groups table, add a unique `invite_token` to `wichteln_groups`, rename `wichteln_users.password` to `password_hash`), leaving `001_init.sql` untouched. Verify that `lib/migrate.tests.ts` still passes and that a PGlite DB migrated from scratch has the new columns.
- [x] 1.2 Add `services/wichteln/lib/password.ts` with `hashPassword`/`verifyPassword` (scrypt, format `scrypt$N$r$p$salt$hash`, `timingSafeEqual`) and `lib/password.tests.ts`. Verify by tests: the right password verifies, a wrong one fails, the same password hashes to different values, and a malformed stored value returns `false`.

## 2. Store

- [x] 2.1 Rework `lib/store.ts`: `Group.inviteToken`, drop `User.password` from the domain type and from `USER_COLUMNS`, change `createGroup(db, name)` to generate the invite token without participants, add `getGroupByInviteToken`, and remove `addParticipants`. Verify by updated `lib/store.tests.ts` (group created with a token and no users, lookup by token, unknown token returns `null`, empty name rejected).
- [x] 2.2 Add `registerParticipant(db, groupId, name, passwordHash)`: lock the group, wish phase only, case-insensitive duplicate check, and map `23505` to the same error. Verify by store tests for success, a duplicate name in any case, the same name allowed in another group, and refusal in the selection phase.
- [x] 2.3 Replace `authenticateParticipant` with the group-scoped `authenticateParticipant(db, groupId, name, password)` (dummy verify when the name is unknown). Verify by store tests: a correct login, a wrong password, an unknown name, and the same credentials refused for another group.
- [x] 2.4 Add `resetPassword(db, groupId, userId)`, returning a freshly generated 10-character password and storing only its hash. Verify by store tests: the old password fails, the returned password authenticates, the stored value is not the plain password, and an unknown user is refused.
- [x] 2.5 Adapt the existing wish/selection store tests to create participants through `registerParticipant`. Verify that `pnpm --filter @homeserver/wichteln test` passes.

## 3. Participant flow (invite page)

- [x] 3.1 Add the actions `groupLogin` and `register` to `app/actions.ts`. Both resolve the group from a hidden `token` field. Validation: name 1–60 characters, password 8–200 characters, confirmation matches. On success they set the user session and redirect to `/wunsch`. Make `logout` redirect participants to their invite page. Restrict `login` to the administrator, with an error that points participants to their invite link. Verify by running the app: wrong credentials and invalid input show the German error messages.
- [x] 3.2 Add `app/g/[token]/page.tsx` (not-found for unknown token, redirect to `/wunsch` when already signed in to this group, group name heading) and the client components `GroupLoginForm` and `RegisterForm` in `components.tsx`. Replace the register form with a notice outside the wish phase. Verify in the browser: register → wish page, logout → back on the invite page, sign in again works, and the same credentials on another group's link fail.
- [x] 3.3 Update the start page `app/page.tsx` text to admin sign-in plus a hint that participants use their invite link. Verify by opening `/` in the browser.

## 4. Administrator flow

- [x] 4.1 Simplify `CreateGroupForm`/`createGroup` admin action to the group name only, and remove `AddParticipantsForm`, the `addParticipants` action and `parseNames`. Verify in the browser: creating a group opens its page with no participants.
- [x] 4.2 Rework `app/admin/[groupId]/page.tsx`: show the invite link with a `CopyInviteLink` client component (replacing `CopyCredentials`), show no passwords, and add a per-participant "Passwort zurücksetzen" form whose `useActionState` result shows the new password once. Keep "Entfernen" in the wish phase only. Verify in the browser: copy the link, reset a password and sign in with it on the invite page, and the password is gone after a reload.

## 5. Docs and verification

- [x] 5.1 Update the Wichteln paragraph in `README.md` (self-registration through an invite link and hashed passwords instead of per-participant passwords handed out by the admin). Verify by reading the rendered section.
- [x] 5.2 Run `pnpm --filter @homeserver/wichteln lint:ci`, `test` and `build`, and verify that all three succeed.
- [x] 5.3 Walk through the full flow in the dev app (create a group, register 3 participants via the link, enter wishes, remove one, reset a password, start selection, confirm registration is closed while sign-in still works, everyone selects) and verify it matches `specs/wichteln/spec.md`.

## Workflow follow-up

- After review and the single apply commit, run `openspec-archive-change` to sync the delta into `openspec/specs/wichteln/spec.md`, open the PR and follow it until merged.
