# Tasks

## 1. Renovate configuration

- [ ] 1.1 Remove `schedule` and `timezone` from `.github/renovate.json5`; verify with `grep -nE 'schedule|timezone' .github/renovate.json5` (no match) and that the file is still valid JSON5 (`pnpm exec renovate-config-validator .github/renovate.json5` or `npx --yes --package renovate renovate-config-validator`)
- [ ] 1.2 Add `RENOVATE_GIT_AUTHOR: "lizzyTheLizard <14069652+lizzyTheLizard@users.noreply.github.com>"` to the `env` of the Run Renovate step in `.github/workflows/renovate.yml` and reword the cron comment (no longer tied to a config window); verify the YAML parses and `pnpm lint:ci` passes
- [ ] 1.3 Update the Renovate section of `infrastructure/README.md`: drop the "before 6 a.m." window and the "outside the window" sentence, mention the git author; verify no remaining reference to a window with `grep -n -i 'window\|6 a.m' infrastructure/README.md`

## Workflow follow-up

- After merge, dispatch the Renovate workflow by hand once and verify it opens pull requests and the log has no `gitAuthor` warning.
