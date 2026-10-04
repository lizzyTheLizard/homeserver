# Tasks

## 1. Remove Chromatic from the web package

- [x] 1.1 Delete `web/chromatic.config.json`, remove the `chromatic` script and the
      `chromatic` and `@chromatic-com/storybook` dev dependencies from `web/package.json`,
      reinstall, and remove the `@chromatic-com/storybook` addon from `web/.storybook/main.ts`;
      verify `pnpm --filter @homeserver/web build`, `pnpm --filter @homeserver/web lint:ci`,
      `pnpm --filter @homeserver/web build-storybook` and the Storybook interaction test
      project all pass, and no `chromatic` reference remains in `web/package.json` or the
      lockfile

## 2. Remove Chromatic from CI

- [x] 2.1 Remove the `test-web-chromatic` job and its entry in the `all-build-checks` `needs`
      list from `.github/workflows/homeserver.yml` and verify the workflow contains no
      `chromatic` or `CHROMATIC_PROJECT_TOKEN` reference, the gate's `needs` list matches
      exactly the remaining live job ids, and the pushed PR run stays green

## 3. Update documentation

- [ ] 3.1 Remove the Chromatic command line from `AGENTS.md` (line 13) and the command-table
      row from `README.md` (line 71), update the `README.md` pipeline description (line 118)
      to drop Chromatic, and verify the docs no longer mention Chromatic or a `chromatic`
      command
- [ ] 3.2 Sweep the repository (excluding `.git` and `openspec/`) for any remaining
      `chromatic` / `CHROMATIC` reference and verify none remain in code, config, or docs

## 4. Integration verification

- [ ] 4.1 Verify the full web suite stays green (`pnpm --filter @homeserver/web lint:ci`,
      unit, integration, Storybook projects) and the workflow's `all-build-checks` gate lists
      exactly the live jobs without `test-web-chromatic`