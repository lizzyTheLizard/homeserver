# Proposal

## Why

The stack cannot send email today, so nobody notices a failed nightly backup until the data is needed. [Brevo](https://app.brevo.com/) offers transactional email over HTTPS, but mail from `gutschi.site` only reaches inboxes if the zone served by `bind9` authorises Brevo (SPF, DKIM, domain verification), especially with the existing DMARC policy `p=quarantine`.

## What Changes

- Add the DNS records Brevo needs to the `gutschi.site` zone served by `bind9`: extend the SPF record with Brevo (keeping Outlook), add the two Brevo DKIM records and the Brevo domain-verification record. Account-specific values come from `.env` and are substituted at start-up like `HOST_IP`.
- Give the backup service a small Brevo client (Brevo transactional email HTTP API) and use it to send a mail to a configurable recipient when a backup fails, and when a backup succeeds, unless that is switched off.
- All mail settings are environment variables (API key, sender, recipient, success-mail switch), documented in `infrastructure/env.example` and `infrastructure/README.md`, and passed through `docker-compose.yml`.
- A mail that cannot be sent is logged and never changes the outcome of the backup or stops the schedule.

Out of scope: sending mail from `services/web` (no consumer yet; the Brevo client can be moved to a shared place when the first web use case appears), receiving mail, mail templates.

Assumption: "bind9" in the request means the DNS server (`bind9`), and "caller of bind9" means a caller of Brevo.

## Capabilities

### New Capabilities

### Modified Capabilities
- `infrastructure`: the zone served by `bind9` authorises Brevo to send mail for the domain, with account-specific values from the environment.
- `backup`: the backup service reports every run's outcome by email through Brevo (failures always, successes configurable).

## Impact

- `infrastructure/bind9/db.gutschi.site`, `infrastructure/docker-compose.yml` (zone rendering, backup environment), `infrastructure/env.example`, `infrastructure/README.md`.
- `services/backup/src/` (new mail module, config, hook into the run, tests). No new npm dependency (uses `fetch`).
- Requires a Brevo account with the domain `gutschi.site` added, a verified sender and an API key (manual, documented).
