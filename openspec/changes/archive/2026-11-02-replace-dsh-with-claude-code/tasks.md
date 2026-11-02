# Tasks

## 1. Swap the tool install in the image

- [x] 1.1 In `services/dev-machine/Dockerfile` replace `RUN npm install -g @deepseek-ai/dsh` with `RUN npm install -g @anthropic-ai/claude-code` (and fix the "# 6. Install code-server, Deepsek harness and openspec" comment) — verify the Dockerfile no longer references `@deepseek-ai/dsh` with `grep -n "deepseek\|dsh\|claude-code" services/dev-machine/Dockerfile`.

## 2. Remove the DSH start-up step

- [x] 2.1 In `services/dev-machine/entrypoint.sh` remove step 5 (`dsh plugin --profile web add dsh-web-startup-auth@latest`) and renumber the following supervisord step — verify with `grep -n "dsh\|deepseek\|plugin" services/dev-machine/entrypoint.sh` that no DSH reference remains.

## 3. Replace the supervised program

- [x] 3.1 In `services/dev-machine/supervisord.conf` replace the `[program:deepseekharness]` block with a `[program:claude-remote-control]` program running `claude remote-control --spawn session` with `directory=/home/dev/workspace` and the same autostart/autorestart/log settings — verify with `grep -n "deepseek\|harness\|claude" services/dev-machine/supervisord.conf` that DSH is gone and the Claude program is present.

## 4. Remove the reverse-proxy route and publish

- [x] 4.1 In `infrastructure/caddy/Caddyfile` remove the `:8444` block that reverse-proxies `dev-machine:3080` — verify with `grep -n "8444\|3080" infrastructure/caddy/Caddyfile` that no route remains.
- [x] 4.2 In `infrastructure/docker-compose.yml` remove the `"8444:8444"` line from the `nginx` service ports — verify with `grep -n "8444" infrastructure/docker-compose.yml` that it is absent while `8443` and `8445` remain.

## 5. Update the documentation

- [x] 5.1 Update `README.md` (the "Browser VS Code / OpenCode" access list and any DSH/"OpenCode"/harness references) to describe Claude Code Remote Control instead — verify with `grep -ni "dsh\|deepseek\|opencode\|harness" README.md` that stale references are gone.
- [x] 5.2 Update `infrastructure/README.md` (component table, "How things are reachable", §5.7 bootstrap) to remove the harness-UI/`8444` row and the DSH "DeepSeek Harbenss" mention, and document the Claude Code install, `claude remote-control` service and the one-time `claude /login` + eligible-subscription requirement — verify with `grep -ni "dsh\|deepseek\|harness\|8444" infrastructure/README.md`.
- [x] 5.3 Update `AGENTS.md` (the dev-machine description that names "OpenCode (`opencode serve`, `dev.gutschi.site:8444`)") to reference Claude Code Remote Control and drop the `8444`/OpenCode claim — verify with `grep -ni "dsh\|deepseek\|opencode\|8444" AGENTS.md`.

## 6. Integration check

- [x] 6.1 Run `openspec validate replace-dsh-with-claude-code --strict` and confirm it passes with no warnings — verify the command exits 0.
- [x] 6.2 Run a repo-wide search `grep -rni "dsh\|deepseek\|@deepseek-ai" --include="*.md" --include="*.sh" --include="*.conf" --include="Dockerfile" --include="*.yml" --include="*.yaml" . | grep -v node_modules | grep -v ".next"` and confirm no live references remain outside the OpenSpec change artifacts themselves.
