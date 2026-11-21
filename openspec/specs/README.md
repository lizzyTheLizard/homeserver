# Gutschi.site capabilities

This folder holds the OpenSpec capabilities for Gutschi.site. They mirror the repository's own
structure: one capability per service or application area, with the web application's areas nested
under `web`.

The OpenSpec CLI lists capabilities alphabetically, so this file records the order they should be
read in.

1. **[web](web/spec.md)** — the web application as a whole: the authenticated shell, access by
   application, the shared design language and components, server actions and migrations.
   - **[web/startpage](web/startpage/spec.md)** — the start page, its assistant chat and input, and
     its areas.
     - [web/startpage/assistant](web/startpage/assistant/spec.md) — the assistant chat endpoint, its
       conversations, skills and tools.
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
2. **[dev-machine](dev-machine/spec.md)** — the development container: SSH, the browser-based
   development interfaces, the repository bootstrap and the toolchain.
3. **[infrastructure](infrastructure/spec.md)** — the deployed stack: the docker-compose services,
   the reverse proxies and TLS, DNS, and backup and restore.
4. **[pipeline](pipeline/spec.md)** — the single GitHub pipeline: change detection, per-service
   linting, test suites and Docker image builds, publish and deploy from `main`, and the one
   always-running "Quality Gate" that pull requests require.
5. **[ci/change-guard](ci/change-guard/spec.md)** — the pipeline's pull-request guard that rejects a change
   which is not archived, not named after its branch, or whose spec deltas were not synced.

The `wichteln` application's capability is added by its in-flight change in
[`openspec/changes/wichteln`](../changes/wichteln/proposal.md).
