# Design

## Context

See proposal.md - Why. Current Chromatic surface in the repo (issue #378 technical notes):

- `web/chromatic.config.json` (projectId, `onlyChanged`, `zip`)
- `web/package.json` - `chromatic` script, `chromatic` and `@chromatic-com/storybook` dev
  dependencies
- `web/.storybook/main.ts` - the `@chromatic-com/storybook` addon
- `.github/workflows/homeserver.yml` - the `test-web-chromatic` job (`chromaui/action@latest`,
  `CHROMATIC_PROJECT_TOKEN`, `autoAcceptChanges: main`, `exitZeroOnChanges: false`) and its
  entry in the `all-build-checks` `needs` list
- Docs: `AGENTS.md:13` and `README.md:71` (`pnpm --filter @homeserver/web chromatic`);
  `README.md:118` pipeline description names Chromatic.
- Earlier proposals for a replacement (Lost Pixel, then a Playwright suite) were dropped
  during planning: the project wants plain removal. Because the `ci/integration-smoke` gate
  requirement is generic and never names Chromatic, no spec delta is needed - the change sets
  `skip_specs: true`.

## Goals / Non-Goals

**Goals:**
- Complete removal of Chromatic from code, config, CI, and docs.
- The "All Build Check Success" gate and every other job keep working after the removal.
- No dangling references (grep-clean).

**Non-Goals:**
- No replacement visual regression tool (a future change may add one).
- No changes to Storybook stories, the other test suites, or the deploy pipeline.
- No preserving of visual regression coverage.

## Decisions

### 1. Remove only, no replacement

Adopt plain removal: no Lost Pixel (archived/sunset), no Playwright harness, no other tool.
Rationale: the project decided it does not want a visual regression service dependency right
now; adopting a bespoke harness or a frozen tool adds machinery a removal does not need.
If visual regression is wanted later, it becomes its own issue/change; the removed Chromatic
code stays in git history as a reference.

### 2. One removal, reviewable commit-sized steps

Even though the change is a deletion, the artifacts target one coherent commit per task:
package change (config + deps + script), Storybook addon, CI job + gate entry, docs, then a
sweep. This keeps every intermediate state building and green.

### 3. CI gate handling

Remove `test-web-chromatic` from the `all-build-checks` `needs` list and delete the job. The
job's fail-if-any-failure logic stays untouched; the gate then covers exactly the remaining
lint/test/build/smoke jobs. The `ci/integration-smoke` requirement text needs no change
(proposal - Capabilities).

### 4. Documentation

- `AGENTS.md:13` - remove the `pnpm --filter @homeserver/web chromatic` line (no replacement
  command).
- `README.md:71` - remove that command-table row.
- `README.md:118` - update the pipeline description to drop Chromatic.
- No new command is documented anywhere.

### 5. Secret cleanup

`CHROMATIC_PROJECT_TOKEN` cannot be deleted from the repository; it is removed manually in
the repository settings after merge (the workflow no longer references it once this change
lands).

## Risks / Trade-offs

- **R1: Visual regression coverage disappears.** This is the intended outcome (Non-Goals),
  decided by the project during planning.
  → Mitigation: the removed configuration and job stay in git history, so coverage can be
  re-added as a future change without reconstructing the old setup.
- **R2: Incomplete removal leaves dangling references.** A leftover import, job, or doc
  reference would be confusing and could break the gate wiring.
  → Mitigation: a final sweep task greps the repository (excluding `.git` and `openspec/`)
  for `chromatic`/`CHROMATIC` and verifies zero matches.
- **R3: Gate breaks if the `needs` list is edited wrongly.** Removing the wrong entry would
  silently change what the merge gate covers.
  → Mitigation: after the edit, verify the `needs` list exactly matches the live job ids in
  the workflow, and the pushed PR run stays green.

## Migration Plan

1. Implement the removal on the branch (package, Storybook config, workflow + gate, docs).
2. Push; the pipeline runs without a Chromatic job, and `all-build-checks` passes with the
   remaining jobs.
3. After merge: manually remove the `CHROMATIC_PROJECT_TOKEN` secret from repository
   settings.
4. Rollback: revert the merge - the Chromatic job, deps, config, and docs are intact in git
   history, and the secret still exists until removed, so Chromatic can be restored without
   re-provisioning.

## Open Questions

None.