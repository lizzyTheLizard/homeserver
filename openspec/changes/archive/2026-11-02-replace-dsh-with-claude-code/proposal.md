# Proposal

## Why

The dev machine currently runs the DeepSeek Harness (DSH) as its agent web interface: it is installed in the image, configured at start-up, run by supervisord on port 3080, and published as the "harness UI" on the development hostname. We are moving to Claude Code instead, using its Remote Control feature to drive a local session from any device. DSH should be removed completely, not left alongside the replacement.

## What Changes

- Remove DeepSeek Harness entirely from the dev machine: the `@deepseek-ai/dsh` global install, the `dsh plugin … add dsh-web-startup-auth@latest` start-up step, the `deepseekharness` supervisord program, the container port 3080, and the caddy route that published it on the development hostname.
- Install Claude Code (`@anthropic-ai/claude-code`) into the dev machine image, alongside the other global CLI tools.
- Start Claude Code in Remote Control server mode (`claude remote-control`) as an always-on supervisord program, replacing the removed DSH program.
- Drop the now-unused `8444` publish and its caddy route: Claude Code's Remote Control initiates an outbound HTTPS connection to Anthropic and exposes no local port or web endpoint, so nothing needs to be reverse-proxied for it.
- Document the one-time `claude /login` bootstrap (an eligible Claude subscription is required for Remote Control) and the corrected access story, replacing the stale "OpenCode" and "harness UI" references in the docs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dev-machine`: the machine no longer serves an "agent web interface" on a port; instead it carries Claude Code and starts its Remote Control server as an always-on service, and the start-up preparation no longer installs a DSH browser plugin.
- `infrastructure`: the stack no longer publishes the removed harness-UI port, and the internal-UI auth requirement no longer gates a "harness UI" (Claude Code's Remote Control has no local web surface to gate).

## Impact

- **Image**: `services/dev-machine/Dockerfile` — remove the `@deepseek-ai/dsh` install, add the `@anthropic-ai/claude-code` install.
- **Start-up**: `services/dev-machine/entrypoint.sh` — remove the `dsh plugin` step.
- **Process supervision**: `services/dev-machine/supervisord.conf` — replace the `deepseekharness` program with a `claude-remote-control` program running `claude remote-control`.
- **Reverse proxy / stack**: `infrastructure/caddy/Caddyfile` and `infrastructure/docker-compose.yml` — remove the `8444` route and publish.
- **Documentation**: `README.md`, `infrastructure/README.md` and `AGENTS.md` — replace DSH/"harness UI"/stale "OpenCode" references with Claude Code and its Remote Control access story, including the one-time login and subscription requirement.
- **No runtime or data change**: the dev home, git checkout, SSH keys and toolchain are unaffected; the PostgreSQL databases and other services are untouched.
