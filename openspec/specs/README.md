# Gutschi.site capabilities

This folder holds the OpenSpec capabilities for Gutschi.site. They mirror the repository's own
structure: one capability per service or application area, with the web application's areas nested
under `web`.

The OpenSpec CLI lists capabilities alphabetically, so this file records the order they should be
read in.

1. **[assistant](assistant/spec.md)** — the assistant service: its chat, the greeting and context it
   opens with, its skills (Microsoft mail/tasks/calendar, weather, WhatsApp), the WhatsApp reply
   skill, and its internal Microsoft and WhatsApp APIs.
2. **[web](web/spec.md)** — the web application as a whole: the authenticated shell, access by
   application, the shared design language and components, server actions and migrations.
   - **[web/startpage](web/startpage/spec.md)** — the start page, its assistant chat and input, and
     its areas.
     - [web/startpage/favorites](web/startpage/favorites/spec.md) — favorite management.
     - [web/startpage/microsoft](web/startpage/microsoft/spec.md) — mail, tasks, events and the
       Microsoft connection.
     - [web/startpage/whatsapp](web/startpage/whatsapp/spec.md) — the WhatsApp area of the start
       page.
   - **[web/coeditor](web/coeditor/spec.md)** — the CoEditor area.
     - [web/coeditor/editor](web/coeditor/editor/spec.md) — the editor and its command execution.
     - [web/coeditor/history](web/coeditor/history/spec.md) — the history page.
     - [web/coeditor/settings](web/coeditor/settings/spec.md) — profiles and templates.
   - **[web/cash](web/cash/spec.md)** — the cash area's project-scoped bookkeeping model.
     - [web/cash/accounts](web/cash/accounts/spec.md) — the chart of accounts.
     - [web/cash/projects](web/cash/projects/spec.md) — cash projects.
     - [web/cash/transactions](web/cash/transactions/spec.md) — transactions and the journal,
       including the account-journal balance chart.
     - [web/cash/reports](web/cash/reports/spec.md) — the cash reports.
     - [web/cash/closing](web/cash/closing/spec.md) — closing and the monthly closing workflow.
   - **[web/admin](web/admin/spec.md)** — metrics, current configuration and cash administration.
3. **[dev-machine](dev-machine/spec.md)** — the development container: SSH, the browser-based
   development interfaces, the repository bootstrap and the toolchain.
4. **[infrastructure](infrastructure/spec.md)** — the deployed stack: the docker-compose services,
   the reverse proxies and TLS, DNS, and backup and restore.
5. **[pipeline](pipeline/spec.md)** — the GitHub pipelines, the test suites, linting, the Docker
   image builds and the stack smoke suite.
6. **[whatsapp-bridge](whatsapp-bridge/spec.md)** — the WhatsApp bridge's per-user wacli processes,
   isolated stores, REST API and health endpoint.
