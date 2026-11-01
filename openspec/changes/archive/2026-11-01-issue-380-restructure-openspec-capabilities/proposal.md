# Proposal

## Why

`openspec/specs/` no longer describes what Gutschi.site is. Its eight capabilities sit at ad-hoc
paths (`ai-assistant-chat`, `assistant/whatsapp-skill`, `testing/stack-smoke-suite`, …), whole
parts of the system — the start page, the web shell, admin, the deployment, the pipeline, the
development machine — have no spec home at all, and the list has no useful order. Issue #380 asks
for a complete, ordered capability set so that every part of the system has a spec home and the
capability list reflects the system that actually exists.

## What Changes

- Replace the ad-hoc spec tree with capabilities that mirror the repository's own structure:
  `assistant`, `web`, `dev-machine`, `infrastructure`, `pipeline` and `whatsapp-bridge`.
- `web` becomes a capability of its own, holding the web application's cross-cutting behavior (the
  authenticated shell, application-based access, the shared design language, server actions and
  migrations), and is subdivided into the four web areas `startpage`, `coeditor`, `cash` and
  `admin`.
- Each web area keeps its route structure: `web/coeditor` into `editor`, `history` and `settings`;
  `web/cash` into `accounts`, `projects`, `transactions`, `reports` and `closing`; `web/startpage`
  into `favorites`, `microsoft` and `whatsapp` with the start page itself at the parent.
- `pipeline` is added as one capability covering the GitHub pipelines, the test suites, linting,
  the Docker image builds and the stack smoke suite; `ci/docker-build`, `ci/integration-smoke` and
  `testing/stack-smoke-suite` merge into it.
- `assistant` is added as a capability covering the assistant service, its skills and the WhatsApp
  reply skill; `dev-machine` is added covering the development container; `infrastructure` is added
  covering the deployed stack, the reverse proxies, DNS and backup.
- `whatsapp-bridge` keeps its capability path and gains requirements for its per-user wacli
  processes, isolated stores, REST API and health endpoint.
- Retire the old capability paths whose behavior is re-homed (`ai-assistant-chat`,
  `assistant/whatsapp-skill`, `cash/account-journal`, `ci/docker-build`, `ci/integration-smoke`,
  `coeditor`, `testing/stack-smoke-suite`). Their content is re-homed, not lost.
- Add `openspec/specs/README.md`, which documents the capability list in order. The OpenSpec CLI
  only sorts capabilities alphabetically or by recency, so the order needs an explicit home.
- **BREAKING** for anything that references capability paths (issues, PRs, tooling): spec
  capability paths change; old paths must be replaced by the new ones listed above.
- No product behavior change. No code under `web/`, `assistant/`, `whatsapp-bridge/`,
  `integration-test/`, `dev-machine/` or `infrastructure/` is modified; every spec describes
  behavior that exists today.

## Capabilities

### New Capabilities

- `assistant`: the assistant service — its chat, the greeting and context it opens with, its
  skills (Microsoft mail/tasks/calendar, weather, WhatsApp), the WhatsApp reply skill, and its
  internal Microsoft and WhatsApp APIs.
- `web`: the web application as a whole — authenticated shell, application-based access, shared
  design language and components, server actions, and versioned migrations.
- `web/startpage`: the start page, its assistant chat and input, and its favorites, Microsoft and
  WhatsApp areas.
- `web/startpage/favorites`: favorite management.
- `web/startpage/microsoft`: mail, tasks and events and the Microsoft connection.
- `web/startpage/whatsapp`: the WhatsApp area of the start page.
- `web/coeditor`: the CoEditor area and its editor, history and settings pages.
- `web/coeditor/editor`: the editor and its command execution.
- `web/coeditor/history`: the history page.
- `web/coeditor/settings`: profiles and templates.
- `web/cash`: the cash area's shared project-scoped bookkeeping model.
- `web/cash/accounts`: the chart of accounts.
- `web/cash/projects`: cash projects.
- `web/cash/transactions`: transactions and their journal display, including the balance chart.
- `web/cash/reports`: the cash reports.
- `web/cash/closing`: closing and the monthly closing workflow.
- `web/admin`: metrics, current configuration and cash administration.
- `dev-machine`: the development container's SSH endpoint, browser-based interfaces, repository
  bootstrap and toolchain.
- `infrastructure`: the docker-compose stack, reverse proxies, TLS, DNS, backup and restore.
- `pipeline`: the GitHub pipelines, the test suites, linting, the Docker image builds and the
  stack smoke suite.

### Modified Capabilities

- `whatsapp-bridge`: keeps its eight existing requirements and gains requirements for its per-user
  wacli process and isolated store, its per-user REST API and its health endpoint.
- `ai-assistant-chat`, `assistant/whatsapp-skill`: every requirement is removed from these
  capabilities; the chat input moves to `web/startpage` and the WhatsApp reply skill to
  `assistant`.
- `cash/account-journal`: every requirement is removed and re-homed into `web/cash/transactions`;
  the capability is retired.
- `ci/docker-build`, `ci/integration-smoke`, `testing/stack-smoke-suite`: every requirement is
  removed from these capabilities and merged into the new `pipeline` capability; the capabilities
  are retired.
- `coeditor`: every requirement is removed; the design-language requirements are generalized into
  `web`, the preserved behavior into `web/coeditor` and the editor behavior into
  `web/coeditor/editor`; the capability is retired.

## Impact

- `openspec/specs/` is restructured: twenty new capability specs are added, `whatsapp-bridge` gains
  requirements, seven old capability paths are retired, and `openspec/specs/README.md` is added.
- Retired capability paths: `ai-assistant-chat`, `assistant/whatsapp-skill`, `cash/account-journal`,
  `ci/docker-build`, `ci/integration-smoke`, `coeditor`, `testing/stack-smoke-suite`.
- Downstream references in issues, PR bodies and agent skills that name an old capability path must
  be updated to the new path; the change records the mapping.
- No runtime, API, database or dependency impact.
