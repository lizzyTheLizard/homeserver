# Tasks

## 1. TypeScript upgrade

- [ ] 1.1 Set `typescript` to the latest 7.x in web, assistant, whatsapp and wichteln (remove the `npm:@typescript/typescript6` alias and the `5.9.3` pin); run `pnpm install`
- [ ] 1.2 Fix `tsconfig*.json` and source errors surfaced by TS 7 until `pnpm build` and `pnpm test` pass; verify Storybook (`build-storybook`) still works

## 2. Replace ESLint with Oxlint

- [ ] 2.1 Add `oxlint` and `oxlint-tsgolint` to each package; create `.oxlintrc.json` mirroring the current rule intent (type-aware recommended/strict, react-hooks, react-refresh and storybook via jsPlugins where they work, `no-extraneous-class` off, ignores for `.next`, `dist`, `storybook-static`, `out`, `build`, `next-env.d.ts`)
- [ ] 2.2 Switch `lint` and `lint:ci` scripts to Oxlint; remove `.eslintcache` from `clean`, `.gitignore`, `.dockerignore`
- [ ] 2.3 Remove `eslint.config.mjs` and all ESLint/typescript-eslint/@stylistic/globals dependencies; `pnpm install`
- [ ] 2.4 Convert `eslint-disable*` comments to `oxlint-disable*` (drop those for rules no longer present)
- [ ] 2.5 Fix findings from `pnpm lint:ci` across all packages

## 3. Docs and tooling

- [ ] 3.1 Update `.vscode/extensions.json` and `settings.json` (Oxc extension, no ESLint settings)
- [ ] 3.2 Update `CLAUDE.md` lint description and the "stylistic rules not enforced" note

## 4. Verification

- [ ] 4.1 Run `pnpm lint:ci`, `pnpm build` and `pnpm test` for all packages
