# Tasks

## 1. Store

- [ ] 1.1 Change `resetPassword` in `services/wichteln/lib/store.ts` to take an account id, update `wichteln_accounts` directly and return "Konto nicht gefunden." for an unknown id; update the existing reset tests in `lib/store.tests.ts` (including one for an account removed from all groups) and verify `pnpm --filter @homeserver/wichteln test` passes
- [ ] 1.2 Add `listAccounts(db)` to `lib/store.ts` returning every account with id, name and its group names, ordered by name ignoring case, without the password hash; add tests for ordering, an account in several groups and an account in no group, and verify they pass

## 2. Admin UI

- [ ] 2.1 Change the `resetPassword` server action in `app/admin/actions.ts` to `resetPassword(accountId)` and bind it with `u.accountId` on `app/admin/[groupId]/page.tsx`; verify `pnpm --filter @homeserver/wichteln build` succeeds and a reset on the group page still shows the new password once
- [ ] 2.2 Add `app/admin/konten/page.tsx` (guarded by `requireAdmin`, `dynamic = 'force-dynamic'`) listing all accounts with their group names, or "Keiner Gruppe zugeordnet", and a `ResetPasswordForm` per account, plus a back link to `/admin`; verify in `pnpm dev:wichteln` that the list shows all accounts and a reset shows a new password that is gone after reload
- [ ] 2.3 Add a "Konten" card with a link to `/admin/konten` on `app/admin/page.tsx`; verify the link opens the account list and that opening `/admin/konten` without an admin session redirects to the start page

## 3. Verification

- [ ] 3.1 Run `pnpm --filter @homeserver/wichteln lint:ci`, `test` and `build` and verify all pass

## Workflow follow-up

- Review the full diff, commit once with the `OpenSpec-Change:` and `Agent:` trailers, and push.
- Archive the change with the openspec-archive-change workflow.
