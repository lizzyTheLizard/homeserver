# Design

## Context

The dev machine (`services/dev-machine/`) is a `node:24-bookworm-slim` container that provides SSH, code-server, Storybook and — today — the DeepSeek Harness web UI. DSH is wired in four places: installed globally in the Dockerfile (`npm install -g @deepseek-ai/dsh`), configured in `entrypoint.sh` (`dsh plugin --profile web add dsh-web-startup-auth@latest`), run as the `deepseekharness` supervisord program (`dsh web … --port 3080`), and published as `:8444` through caddy (`dev-machine:3080`). The docs (README.md, infrastructure/README.md, AGENTS.md) also carry stale "OpenCode on 8444" and "harness UI" references.

Claude Code's Remote Control works differently: `claude remote-control` runs a server that registers with the Anthropic API and polls for work over outbound HTTPS only. It opens no inbound port and serves no local web UI, so there is nothing to reverse-proxy. A developer connects from claude.ai/code or the Claude mobile/desktop app. It requires an eligible Claude subscription (Pro/Max/Ultra/Team/Enterprise) and a one-time `claude /login`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Remove every trace of DSH from the image, start-up, supervision and proxy config.
- Install Claude Code and start its Remote Control server as an always-on supervisord program, so it comes up with the dev machine (the user chose the supervisord/always-on lifecycle).
- Update the specs (`dev-machine`, `infrastructure`) and the docs to match reality, including the login/subscription prerequisite.

**Non-Goals:**
- Automating or persisting the one-time `claude /login` (it is interactive and account-scoped).
- Providing any local web UI or reverse-proxy endpoint for Claude Code (there is none).
- Changing the dev home volume, git bootstrap, SSH keys, toolchain, or any other service.

## Decisions

**Install via npm (`npm install -g @anthropic-ai/claude-code`), not the native installer.**
The Dockerfile already installs code-server, DSH and OpenSpec globally with npm, so `@anthropic-ai/claude-code` matches that pattern and keeps the image reproducible. *Alternative considered:* `curl -fsSL https://claude.ai/install.sh | bash` (the "recommended" native install). Rejected for the container because the npm global install slots into the existing layer alongside the other tools and needs no PATH plumbing; the npm package `@anthropic-ai/claude-code` is the published, versioned distribution.

**Run `claude remote-control` (server mode), not `claude --remote-control`.**
Server mode is designed to be a long-lived, always-on process (the `claude remote-control` command stays running and waits for connections), which matches supervisord's `autostart`/`autorestart` model. *Alternative considered:* `claude --remote-control` starts an interactive TUI session, which does not fit a non-TTY supervisord process.

**Supervise it as a dedicated program with `--spawn session` in the workspace directory.**
The program runs `claude remote-control` with its working directory at `/home/dev/workspace` (the cloned repo) so the session operates on the repository. Using `--spawn session` serves exactly one session and rejects additional connections, which keeps the always-on process deterministic and avoids the on-demand worktree/same-dir concurrency modes that a headless supervisor can't drive. *Alternative considered:* default `same-dir`/`worktree` spawn modes — rejected as they assume an interactive operator pressing keys to switch modes.

**No caddy route or compose port for Claude Code.**
Because Remote Control has no inbound endpoint, the `8444` caddy block and the `8444:8444` nginx publish are removed outright, not repointed. The nginx `ports` mapping in docker-compose (`"8444:8444"`) is dropped.

**Leave the `claude /login` bootstrap to the developer, documented.**
Remote Control requires an eligible subscription and an interactive `/login` (or `claude` sign-in). The entrypoint cannot perform this non-interactively. The docs gain an explicit first-run step, and supervisord's `autorestart` simply restarts the process if it exits (e.g. not yet logged in), which surfaces the problem in the logs rather than failing the container start.

## Risks / Trade-offs

- **Remote Control requires an eligible paid subscription and `ANTHROPIC_BASE_URL` must be unset (or point at `api.anthropic.com`).** → Mitigation: document the requirement; the machine still boots (supervisord keeps the process restarted), and the login step is called out explicitly.
- **No auth gate in front of Claude Code.** → Mitigation: this is by design — Remote Control authenticates via the developer's own claude.ai account and exposes no local web surface; the removed `8444` basic-auth block no longer applies.
- **Stale docs elsewhere may still mention "OpenCode" or the harness UI.** → Mitigation: the tasks enumerate every known reference (README.md, infrastructure/README.md, AGENTS.md, caddy, compose) and the change updates them together.
- **Supervisord runs as `dev`; `claude` state lives in `/home/dev/.claude`** inside the `dev_home` volume, so login and session state persist across recreations but the login is per-volume/per-account. → Mitigation: call this out in the docs (login is a one-time step that survives restarts because `dev_home` persists).

## Migration Plan

1. Land the Dockerfile/entrypoint/supervisord/caddy/compose edits and the doc updates together on the `replace-dsh-with-claude-code` branch.
2. The per-service CI rebuilds and publishes `homeserver-dev-machine:latest`; the infra deploy pulls it and recreates the `dev-machine` container.
3. On first start after deploy, the operator runs `docker compose exec -it dev-machine claude` (or `claude /login`) once to sign in with an eligible account, then confirms the `claude-remote-control` supervisord program is RUNNING.
4. Rollback: the change is additive-removal — reverting the branch restores DSH install/program/route; no data migration is involved.

## Open Questions

None.
