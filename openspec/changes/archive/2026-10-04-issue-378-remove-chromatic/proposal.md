# Proposal

## Why

Chromatic is a cloud SaaS: it uploads screenshots to an external service and gates the
pipeline on a secret project token. This project wants no part of its test infrastructure to
depend on an external service, so Chromatic is removed entirely — without a replacement tool
(issue #378).

## What Changes

- Remove every Chromatic piece from the web package:
  - Delete `web/chromatic.config.json`.
  - Remove the `chromatic` script and the `chromatic` and `@chromatic-com/storybook` dev
    dependencies from `web/package.json`.
  - Remove the `@chromatic-com/storybook` addon from `web/.storybook/main.ts` (stories glob
    and other addons untouched).
- Remove `test-web-chromatic` from `.github/workflows/homeserver.yml`, including its entry in
  the `all-build-checks` `needs` list; the aggregated gate keeps covering the remaining
  lint/test/build/smoke jobs.
- Update `AGENTS.md` and `README.md` so nothing documents a `chromatic` command and the
  pipeline description no longer names Chromatic.
- **BREAKING** (tooling): the `pnpm --filter @homeserver/web chromatic` command disappears and
  visual regression coverage is deliberately dropped — no replacement is introduced in this
  change.

## Capabilities

None. This is a pure tooling/docs removal with no behavior-contract change: the
`ci/integration-smoke` "Single required merge check" requirement describes the aggregated
gate generically ("every testing, linting, and building job in the pipeline") and never
names Chromatic, so it needs no delta, and no capability regains or loses normative
requirements. The change therefore sets `skip_specs: true` in `.openspec.yaml` (openspec
validate rejects a zero-delta change without that marker).

## Impact

- `web/chromatic.config.json` - deleted.
- `web/package.json` - `chromatic` and `@chromatic-com/storybook` dev dependencies removed,
  `chromatic` script removed.
- `web/.storybook/main.ts` - `@chromatic-com/storybook` addon removed.
- `.github/workflows/homeserver.yml` - `test-web-chromatic` job removed, its `all-build-checks`
  `needs` entry removed.
- `AGENTS.md`, `README.md` - Chromatic command and pipeline references removed.
- Storybook stories, the other test suites, and the deploy pipeline are untouched.
- Repository settings: `CHROMATIC_PROJECT_TOKEN` secret removed (manual cleanup, outside this
  change's code footprint).