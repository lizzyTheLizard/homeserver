# Tasks

Each task materializes one capability group into `openspec/specs/` from this change's delta specs,
so the folder already satisfies issue #380 after the task. A retired capability path is removed in
the same task that adds the spec re-homing its behavior, so no covered behavior ever disappears
from the tree.

## 1. pipeline

- [ ] 1.1 Add `openspec/specs/pipeline/spec.md` from this change's `pipeline` delta (converting `## ADDED Requirements` to `## Requirements`, keeping `## Purpose`), and delete the retired `openspec/specs/ci/docker-build/`, `openspec/specs/ci/integration-smoke/` and `openspec/specs/testing/` specs together with their now-empty parent directories. Verify: `openspec list --specs` names `pipeline` and none of `ci/docker-build`, `ci/integration-smoke`, `testing/stack-smoke-suite`; `openspec validate --specs` passes

## 2. web shell

- [ ] 2.1 Add `openspec/specs/web/spec.md` from this change's `web` delta, including the generalized design-language requirement re-homed from `coeditor`. Verify: `openspec list --specs` names `web`; `openspec validate --specs` passes

## 3. web/startpage, favorites and microsoft

- [ ] 3.1 Add `openspec/specs/web/startpage/spec.md`, `openspec/specs/web/startpage/favorites/spec.md` and `openspec/specs/web/startpage/microsoft/spec.md` from this change's deltas, re-homing the assistant chat input from `ai-assistant-chat` into `web/startpage`. Verify: `openspec list --specs` names `web/startpage`, `web/startpage/favorites` and `web/startpage/microsoft`; `openspec validate --specs` passes

## 4. web/startpage/whatsapp, retiring the old assistant UI

- [ ] 4.1 Add `openspec/specs/web/startpage/whatsapp/spec.md` from this change's delta, and delete the retired `openspec/specs/ai-assistant-chat/spec.md` and its directory, whose chat-input requirements now live in `openspec/specs/web/startpage/spec.md`. Verify: every requirement name removed by the `ai-assistant-chat` delta is present in `web/startpage`; `ai-assistant-chat` is gone from `openspec list --specs`; `openspec validate --specs` passes

## 5. assistant, retiring the old skill path

- [ ] 5.1 Add `openspec/specs/assistant/spec.md` from this change's delta, re-homing the WhatsApp reply skill, and delete the retired `openspec/specs/assistant/whatsapp-skill/spec.md` and its directory. Verify: every requirement name removed by the `assistant/whatsapp-skill` delta is present in `assistant`; `assistant/whatsapp-skill` is gone from `openspec list --specs`; `openspec validate --specs` passes

## 6. whatsapp-bridge

- [ ] 6.1 Update `openspec/specs/whatsapp-bridge/spec.md` from this change's delta: keep its eight existing requirements unchanged and add the per-user process and store, the per-user REST API and the health-endpoint requirements. Verify: the eight original requirement names are still present; `openspec list --specs` still names `whatsapp-bridge`; `openspec validate --specs` passes

## 7. web/coeditor, retiring the old coeditor path

- [ ] 7.1 Add `openspec/specs/web/coeditor/spec.md`, `openspec/specs/web/coeditor/editor/spec.md`, `openspec/specs/web/coeditor/history/spec.md` and `openspec/specs/web/coeditor/settings/spec.md` from this change's deltas (the editor spec re-homes the retired `coeditor` editor requirement), and delete the retired `openspec/specs/coeditor/spec.md` and its directory. Verify: every requirement name removed by the `coeditor` delta is present in `web`, `web/coeditor` or `web/coeditor/editor`; `coeditor` is gone from `openspec list --specs`; `openspec validate --specs` passes

## 8. web/cash

- [ ] 8.1 Add `openspec/specs/web/cash/spec.md`, `openspec/specs/web/cash/accounts/spec.md`, `openspec/specs/web/cash/projects/spec.md` and `openspec/specs/web/cash/transactions/spec.md` from this change's deltas. Verify: `openspec list --specs` names `web/cash` and those three sub-capabilities; `openspec validate --specs` passes
- [ ] 8.2 Add `openspec/specs/web/cash/reports/spec.md` and `openspec/specs/web/cash/closing/spec.md` from this change's deltas, and delete the retired `openspec/specs/cash/account-journal/spec.md` and its directory, whose balance-chart requirements now live in `openspec/specs/web/cash/transactions/spec.md`. Verify: every requirement name removed by the `cash/account-journal` delta is present in `web/cash/transactions`; `cash/account-journal` is gone from `openspec list --specs`; `openspec validate --specs` passes

## 9. web/admin

- [ ] 9.1 Add `openspec/specs/web/admin/spec.md` from this change's delta. Verify: `openspec list --specs` names `web/admin`; `openspec validate --specs` passes

## 10. dev-machine

- [ ] 10.1 Add `openspec/specs/dev-machine/spec.md` from this change's delta. Verify: `openspec list --specs` names `dev-machine`; `openspec validate --specs` passes

## 11. infrastructure

- [ ] 11.1 Add `openspec/specs/infrastructure/spec.md` from this change's delta. Verify: `openspec list --specs` names `infrastructure`; `openspec validate --specs` passes

## 12. Ordered capability index and final verification

- [ ] 12.1 Add `openspec/specs/README.md` listing the capabilities in order — `assistant`, `web` (with `startpage`, `coeditor`, `cash`, `admin` and their sub-areas), `dev-machine`, `infrastructure`, `pipeline`, `whatsapp-bridge` — each with a one-line description. Verify: `openspec list --specs` still reports exactly the expected capabilities (the README is not mistaken for one) and `openspec validate --specs` passes
- [ ] 12.2 Verify the final tree: the top-level folders of `openspec/specs/` are exactly `assistant`, `web`, `dev-machine`, `infrastructure`, `pipeline` and `whatsapp-bridge`; every capability holds at least one requirement; no retired path remains; `openspec validate --all` and `openspec validate issue-380-restructure-openspec-capabilities --type change --strict` pass
