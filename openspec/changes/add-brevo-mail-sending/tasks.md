# Tasks

## 1. DNS for Brevo

- [ ] 1.1 In `infrastructure/bind9/db.gutschi.site` extend the SPF record with `include:spf.brevo.com`, add the `brevo1`/`brevo2._domainkey` CNAMEs and the `brevo-code:__BREVO_CODE__` TXT record, and bump the serial. Verify: the file keeps exactly one SPF record, and `named-checkzone gutschi.site` passes on the rendered file.
- [ ] 1.2 In `infrastructure/docker-compose.yml` pass `BREVO_CODE` to `bind9`, substitute it next to `HOST_IP` and fail the start when it is empty. Verify: `docker compose config` is valid and a start without `BREVO_CODE` exits with an error.

## 2. Mail from the backup service

- [ ] 2.1 Add `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_TO` (default `matthias.graf@gutschi.site`) and `MAIL_ON_SUCCESS` (default true) to `services/backup/src/config.ts`. Verify: unit tests for defaults, the off values, and the missing-setting error outside development.
- [ ] 2.2 Add `services/backup/src/mail.ts` with `sendMail` calling the Brevo transactional API with `fetch`; log instead of calling in development; swallow and log errors. Verify: unit tests with a mocked `fetch` for the request shape, a rejected response and a network error.
- [ ] 2.3 Report the outcome in `main.ts`/the run wrapper: success mail (dump name, size) unless off, failure mail (error) on error, then rethrow so the exit code and schedule are unchanged. Verify: tests for success, success switched off, failure, and mail failure not changing the result.

## 3. Configuration and docs

- [ ] 3.1 Add the settings to `infrastructure/env.example`, pass them to the `backup` service in `docker-compose.yml`, and document the Brevo setup (domain, DKIM check, API key, sender) in `infrastructure/README.md`. Verify: `pnpm lint` and `pnpm --filter @homeserver/backup test` pass, and `docker compose exec backup node dist/main.js --now` sends the mail.
