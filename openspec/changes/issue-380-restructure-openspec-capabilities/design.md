# Design

## Context

See `proposal.md` for motivation. The constraints that shape the approach:

- OpenSpec treats a capability as `openspec/specs/<capability-path>/spec.md`. A change contributes
  *delta* specs under `openspec/changes/<change>/specs/<capability-path>/spec.md`, using
  `## ADDED`, `## MODIFIED` and `## REMOVED Requirements` blocks; the archive/sync step applies
  those deltas to the main specs.
- A capability whose last requirement is removed is retired: its main spec is deleted rather than
  left as an empty document.
- The CLI only lists capabilities alphabetically or by recency (`openspec list --specs`), so the
  reading order cannot be expressed through the folder layout alone.
- Today's tree holds eight capabilities at ad-hoc paths (`ai-assistant-chat`,
  `assistant/whatsapp-skill`, `cash/account-journal`, `ci/docker-build`, `ci/integration-smoke`,
  `coeditor`, `testing/stack-smoke-suite`, `whatsapp-bridge`). The start page, the web shell, admin,
  the deployment, the pipeline and the development machine have no spec at all.
- The change is anchored to issue #380; change name, branch name and issue number are one triple.
- The structure was chosen with the user: capabilities mirror the repository's own layout rather
  than the product areas the issue originally proposed.

## Goals / Non-Goals

**Goals:**

- A capability set that mirrors the repository: `assistant`, `web`, `dev-machine`,
  `infrastructure`, `pipeline`, `whatsapp-bridge`, with the web areas nested as
  `web/startpage`, `web/coeditor`, `web/cash` and `web/admin`.
- A full spec for every capability area, including the areas and sub-areas that have no spec today,
  describing current behavior only.
- The retired capability paths gone from `openspec/specs/`, with their content re-homed, not lost.
- A single place that documents the capability order.

**Non-Goals:**

- Changing any product behavior, or any code under `web/`, `assistant/`, `whatsapp-bridge/`,
  `integration-test/`, `dev-machine/` or `infrastructure/`.
- Changing how the OpenSpec CLI discovers or sorts capabilities.
- Full one-to-one mirroring of every repository folder (`db/`, `design/`, `openspec/` itself stay
  unrepresented as capabilities; the schema and design system are described inside the capability
  that owns them).

## Decisions

**1. Capabilities mirror the repository structure.** The top level is the repository's own
service/area layout — `assistant`, `web`, `dev-machine`, `infrastructure` — plus `pipeline` for the
CI integration work and the existing `whatsapp-bridge`. Alternative: the product-area structure the
issue proposed (`ci`, `coeditor`, `cash`, `startpage`, `admin`, `infrastructure`), which the user
rejected in favour of mirroring the repo.

**2. `web` owns the cross-cutting web behavior; the four web areas nest below it.** `web/spec.md`
holds what every page shares: the authenticated shell, application-based access, the shared design
language and components, server actions and versioned migrations. `web/startpage`, `web/coeditor`,
`web/cash` and `web/admin` own their areas. Alternative: treating `web` as a plain namespace,
rejected because the shared shell, auth and design language would then have no home and would be
duplicated across the four areas. Confirmed with the user.

**3. The web areas keep the deeper subdivision of their route folders.** `web/coeditor` is
subdivided into `editor`, `history` and `settings`; `web/cash` into `accounts`, `projects`,
`transactions`, `reports` and `closing`; `web/startpage` into `favorites`, `microsoft` and
`whatsapp` with the start page itself at the parent. Confirmed with the user.

**4. `whatsapp-bridge` stays a capability, so it is modified, not retired.** Its path does not
change, so its existing eight requirements stay in place and the delta only adds the bridge's
process, store, REST API and health behavior. The chat input and the WhatsApp reply skill, by
contrast, move out of their old capabilities: the input into `web/startpage` and the skill into
`assistant`.

**5. Retire the other old capabilities with `REMOVED` deltas at their existing paths.** Each gets a
delta at its current path listing every requirement under `## REMOVED Requirements` with a `Reason`
and a `Migration` pointer, so the retirement is auditable and the sync deletes the emptied main
specs. Alternative: deleting the old folders by hand without deltas, rejected because the change
would then not record what disappeared or where it went.

**6. Re-home unchanged requirements with their original name and text.** Requirements whose
behavior does not change keep their header and wording, so a reviewer can diff old and new. Two
exceptions: the CoEditor design-language requirements are generalized into `web/spec.md`, because
the design language is web-wide and the `web` capability now owns it (their old names are retired
in `coeditor` and the generalized requirement is added in `web`); and the account-journal
chart-presentation requirement, which is over the 500-character description limit, is split into a
short description with its scenarios preserved.

**7. Document the order in `openspec/specs/README.md`.** The CLI sorts alphabetically, so the order
needs an explicit home: a README at the root of the specs folder lists the capabilities in order
with a one-line description each. Alternatives: numeric folder prefixes (breaks the kebab-case
capability paths and every existing path reference) and a `config.yaml` key (the CLI has no such
option). A README is a non-capability file, so it must not disturb `openspec list --specs` or
`openspec validate --specs`.

**8. Apply phase materializes the target tree; the archive then finds it already synced.** The
deliverable of this change *is* `openspec/specs/`, so the apply phase writes each new main spec
from its delta (turning `## ADDED Requirements` into `## Requirements`), deletes the retired paths
and adds the README. Alternative: leave `openspec/specs/` untouched and let the agent-driven sync
at archive time do the whole restructure — rejected because the change would then have no tasks of
its own (the repo requires one committable task per step) and the restructuring would be invisible
until the ship step. The archive's sync assessment is expected to report "already synced".

**9. Each requirement has exactly one home.** Journal and account-journal display, including the
balance chart, go to `web/cash/transactions`; admin-only project CRUD to `web/admin`; the deployed
stack (not the CI pipeline or the smoke assertions) to `infrastructure`; the smoke suite's pipeline
role to `pipeline`; the assistant chat input to `web/startpage` and the assistant service, its
skills and the WhatsApp reply skill to `assistant`; the bridge's own behavior to
`whatsapp-bridge`. Parent specs hold only behavior that is genuinely shared.

## Risks / Trade-offs

- **Archive sync may not recognize the already-materialized specs and re-apply a delta** →
  Mitigation: after each task the tree is validated with `openspec validate --specs`, and the ship
  step compares every delta with its main spec as the archive workflow prescribes.
- **Content loss while retiring seven capabilities** → Mitigation: every retired requirement is
  listed explicitly in a `REMOVED` delta with a migration pointer, and a verification step checks
  the name exists in the old main spec before the folder is deleted.
- **Requirement names drifting between a removal delta and the main spec** → Mitigation:
  `openspec validate <change> --type change --strict` and `openspec validate --specs` must pass
  after every task.
- **`whatsapp-bridge` is both kept and referenced by `web/startpage/whatsapp`** → Mitigation: the
  web spec describes only the page's behavior and routes its calls through the assistant; the
  bridge's process management stays solely in the `whatsapp-bridge` capability.
- **The README in `openspec/specs/` being mistaken for a capability** → Mitigation: verify
  `openspec list --specs` still reports exactly the expected capabilities and `openspec validate
  --specs` passes with the README present.
- **A large, single-purpose structural change is hard to review** → Mitigation: one task per
  capability group, each a self-contained commit that leaves the specs tree valid.

## Migration Plan

1. Add the new capability specs and the README group by group; remove each retired path in the same
   commit as the spec that replaces it, so the tree is never missing a covered behavior.
2. Rollback is a revert of the commits; `openspec/specs/` has no runtime effect, and no code,
   database or deployment is touched.
3. Downstream references (issues, PR bodies, agent skills) that name an old capability path must use
   the new one: `ai-assistant-chat` → `web/startpage`; `assistant/whatsapp-skill` → `assistant`;
   `cash/account-journal` → `web/cash/transactions`; `ci/docker-build`, `ci/integration-smoke` and
   `testing/stack-smoke-suite` → `pipeline`; `coeditor` → `web/coeditor` (design language →
   `web`). `whatsapp-bridge` keeps its path.

## Open Questions

None that would change the specs, the approach or the task breakdown.
