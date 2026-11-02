# Tasks

## 1. Full-stack infrastructure deploy

- [x] 1.1 In `.github/workflows/infrastructure.yml`, add `.github/workflows/infrastructure.yml` and `.github/actions/deploy-infrastructure/**` to the `push.paths` trigger next to `infrastructure/**`. Keep `docker compose up -d --force-recreate --remove-orphans` (no service argument) in `.github/actions/deploy-infrastructure/action.yml`. Verify that the YAML parses (`python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" .github/workflows/infrastructure.yml`) and that the paths list contains all three entries.
- [ ] 1.2 In `infrastructure/README.md` §6 (Deployment & repository), describe the `infrastructure.yml` workflow: what triggers it (`infrastructure/**`, its own workflow file, the `deploy-infrastructure` action, manual dispatch) and that it recreates the whole stack with `--force-recreate --remove-orphans`, while service workflows recreate only their own service. Verify that the section names both behaviours.

## 2. Claude Code Remote Control spawn mode

- [ ] 2.1 In `services/dev-machine/supervisord.conf`, change the `claude-remote-control` command to `claude remote-control --spawn same-dir`, keeping `directory=/home/dev/workspace`. Verify that `claude remote-control --help` lists `same-dir` as a valid `--spawn` mode and that `grep -n "spawn" services/dev-machine/supervisord.conf` shows only `--spawn same-dir`.

## 3. Integration check

- [ ] 3.1 Run `openspec validate fix-deploy-and-remote-control --strict` and `pnpm lint:ci`, and verify that both pass.

## Workflow follow-up

- After merge to `main`: confirm that the Infrastructure workflow ran and that `docker compose ps` on the host shows every service freshly created with no orphans. Confirm that the Dev Machine deploy ran and that `supervisorctl status claude-remote-control` reports RUNNING, with new sessions starting in `/home/dev/workspace`.
- Archive the change with `/openspec-archive-change`.
