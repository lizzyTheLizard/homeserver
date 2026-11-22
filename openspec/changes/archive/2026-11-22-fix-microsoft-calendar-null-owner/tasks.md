# Tasks

## 1. Accept calendars without an owner

- [x] 1.1 In `calendar.ts`, make `owner` in `calendarsSchema` accept `null` and map it to `{ name: '', address: '' }`; verify with `pnpm --filter @homeserver/web vitest run app/startpage/microsoft/_external/calendar.tests.ts`.
- [x] 1.2 Add a test in `calendar.tests.ts` where the mocked calendar list contains calendars with `owner: null` and `getCalendars` returns them all with an empty owner; verify it fails without 1.1 and passes with it.
- [x] 1.3 Run `pnpm lint` and `pnpm --filter @homeserver/web test` for the web package; both pass.
