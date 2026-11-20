# Proposal

## Why

TypeScript is on three different lines (`@typescript/typescript6` 6.x in web, assistant and whatsapp; 5.9.3 in wichteln) while 7.x is the current release. `typescript-eslint` only supports `<6.1.0`, so ESLint is what pins us to the old compiler. Replacing ESLint with Oxlint removes that blocker, speeds up linting, and lets all four packages move to one current TypeScript version.

## What Changes

- Upgrade `typescript` to the latest release (7.x) in all four packages, on one shared version; drop the `npm:@typescript/typescript6` alias and the wichteln pin.
- Replace ESLint with Oxlint in web, assistant, whatsapp and wichteln: add `oxlint` (and `oxlint-tsgolint` for type-aware rules), add an `.oxlintrc.json` per package carrying over the current rule intent (recommended + strict/stylistic type-aware, react-hooks, no-extraneous-class off), and switch the `lint` / `lint:ci` scripts.
- Remove `eslint`, `@eslint/js`, `typescript-eslint`, `@stylistic/eslint-plugin`, `eslint-plugin-*`, `globals` and all `eslint.config.mjs` files.
- Convert `eslint-disable` comments in source to `oxlint-disable` equivalents (or drop them where the rule no longer applies).
- Update `.vscode` (Oxc extension instead of ESLint), `.gitignore`/`.dockerignore`/`clean` scripts (`.eslintcache`) and `CLAUDE.md`.
- **BREAKING (tooling only):** `@stylistic` formatting rules (indentation, quotes, semicolons, `max-statements-per-line`) are no longer enforced, as Oxlint has no stylistic rules. No formatter is added in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a tooling and dependency change; the pipeline still lints, tests and builds changed services, so no requirement in `pipeline` changes. The change therefore sets `skip_specs: true`.

## Impact

- `services/{web,assistant,whatsapp,wichteln}`: `package.json`, `tsconfig*.json` (if TS 7 requires adjustments), lint config, source files with disable comments, any code that TS 7 or the new lint rules flag.
- Root: `pnpm-lock.yaml`, `CLAUDE.md`, `.gitignore`, `.dockerignore`, `.vscode/`.
- CI runs the same `pnpm lint:ci`; Docker builds use the new TypeScript. Next.js, Storybook and Vitest must work with TypeScript 7.
