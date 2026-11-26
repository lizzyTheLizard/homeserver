# Design

## Context

`bind9` renders `db.gutschi.site` at container start with `sed` replacing `__HOST_IP__`. The zone has an Outlook MX/SPF, no DKIM and `DMARC p=quarantine`, so unauthenticated Brevo mail would be quarantined. The backup service (`services/backup/src`) has `config.ts` (env, dev defaults, fail at start-up), `backup.ts` (`runBackup`) and `main.ts` (`croner` schedule and `--now`), and `NODE_ENV=development` in dev. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Brevo-authenticated mail for `gutschi.site`, passing SPF/DKIM/DMARC.
- Failure and (switchable) success mails from the backup service, configured only via env.

**Non-Goals:**
- A shared mail package or mail sending from `services/web` (no consumer yet).
- Retries, queues or HTML templates.

## Decisions

- **Brevo HTTP API instead of SMTP.** `POST https://api.brevo.com/v3/smtp/email` with an `api-key` header and a plain-text body, via built-in `fetch`: no new dependency (no nodemailer), no outbound port 587 dependency. Alternative: SMTP relay with nodemailer, rejected for the extra dependency.
- **Mail module in the backup service** (`src/mail.ts`: `sendMail(config, subject, text)`), called from `runBackup`'s caller so both the scheduled run and `--now` report. Reporting wraps the run: on success send the success mail (if enabled), on error send the failure mail and rethrow so the existing error handling and exit code stay unchanged. Alternative: mail inside `runBackup` steps, rejected as it scatters the logic.
- **Mail errors are swallowed and logged** so a Brevo outage cannot turn a good backup into a failure or kill the schedule.
- **Configuration** (all env): `BREVO_API_KEY` (required), `MAIL_FROM` (required, a sender verified in Brevo), `MAIL_TO` (default `matthias.graf@gutschi.site`), `MAIL_ON_SUCCESS` (default `true`; `false`/`0` switches off). In development the key and sender have dev defaults and `sendMail` only logs instead of calling Brevo, consistent with "never uploads" in dev.
- **DNS.** Apex SPF becomes `v=spf1 include:spf.protection.outlook.com include:spf.brevo.com -all` (one SPF record only). Add `brevo1._domainkey` / `brevo2._domainkey` CNAMEs and `@ TXT "brevo-code:__BREVO_CODE__"`. The code is substituted from `BREVO_CODE` in `.env` by the existing `sed` step. The exact DKIM targets are shown in Brevo's domain page after adding `gutschi.site`; the zone uses Brevo's documented pattern (`b1.gutschi-site.dkim.brevo.com.`, `b2...`) and the README tells to compare it with the dashboard. The zone serial is bumped.

## Risks / Trade-offs

- [DKIM targets differ from Brevo's current pattern] → README step to compare with the Brevo dashboard before deploy; DKIM check in Brevo shows the result.
- [Second SPF record would invalidate SPF] → extend the existing record, covered by a spec scenario.
- [A backup that never runs sends no mail] → out of scope; only runs that start are reported.
- [Brevo free plan daily limit] → one or two mails a day.

## Migration Plan

1. Add `gutschi.site` in Brevo, create an API key and a verified sender, put `BREVO_CODE`, `BREVO_API_KEY`, `MAIL_FROM` into `.env`.
2. Deploy; `docker compose up -d --force-recreate bind9 backup`.
3. Authenticate the domain in Brevo, then run `docker compose exec backup node dist/main.js --now` to prove the mail.
Rollback: revert the commit and recreate both containers.
