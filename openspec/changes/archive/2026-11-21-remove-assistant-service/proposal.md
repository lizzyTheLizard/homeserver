# Proposal

## Why

The assistant service exists only as an asynchronous bridge for the chat WebSocket plus a home for Microsoft, WhatsApp and weather logic that the web application calls over an internal REST API with the user's cookie forwarded. That is a second container, a second image, a second pipeline job, a duplicated session/cookie/config/DB layer and a network hop for every Microsoft or WhatsApp page load. All of it can run inside the web application, next to the pages that use it.

## What Changes

- Move all assistant logic into `services/web` and delete `services/assistant`:
  - Microsoft logic (Graph client, token storage, mail/todo/calendar workers, login/callback) next to the Microsoft page in `app/startpage/microsoft/`.
  - WhatsApp logic (bridge client, status, chats, messages, send/archive/sync) next to the WhatsApp page in `app/startpage/whatsapp/`.
  - Chat logic (model call, system prompt, greeting/context, skills, tools, weather, geolocation) in a new `app/startpage/assistant/` directory.
- The Microsoft and WhatsApp server actions call that logic directly instead of the assistant's REST API; the Microsoft OAuth callback route handles the code exchange itself.
- Replace the chat WebSocket with plain HTTP: each user message is one `POST` whose response streams the answer back (newline-delimited JSON events). No bridge is kept; the assistant service is not needed.
- **BREAKING**: the chat no longer survives a dropped connection by reconnecting to the same session with backoff; a failed request is reported and the user can resend. A conversation is kept in web-process memory and is lost on a web restart or after its idle lifetime.
- Remove the assistant container, image, health check, nginx `/ws/assistant` routes, `ASSISTANT_INTERNAL_URL`, the `@assistant/*` path alias and the assistant pipeline job/change detection; the web container gains the AI, Microsoft Graph and WhatsApp bridge configuration it needs.
- The Microsoft token table moves into the web application's own migrations (same table, existing tokens are kept).

## Capabilities

### New Capabilities
- `web/startpage/assistant`: The chat as a feature of the web application: its HTTP chat endpoint, conversation lifetime, streamed answers, greeting and context, skills, tools and bounded model limits.

### Modified Capabilities
- `assistant`: Removed in full; the service no longer exists and its behavior moves to `web/startpage/assistant`, `web/startpage/microsoft` and `web/startpage/whatsapp`.
- `web/startpage`: The chat talks to the web application over HTTP instead of a WebSocket; reconnect behavior is replaced by error-and-resend.
- `web/startpage/microsoft`: Microsoft data is read and changed in the web application itself, not through the assistant.
- `web/startpage/whatsapp`: WhatsApp is reached by the web application directly (bridge), not through the assistant.
- `infrastructure`: No assistant container, healthcheck, WebSocket route or database sharing; streaming chat route and bridge dependency for the web service.
- `pipeline`: No assistant service in change detection, jobs, images or deployment.

## Impact

- Code: `services/assistant/**` deleted; new code in `services/web/app/startpage/{assistant,microsoft,whatsapp}/`; `AiChatWebSocket.ts` replaced; `services/web/db/` gets a migration; `services/web/package.json` gains `@microsoft/microsoft-graph-client` and `async-mutex`; `Dockerfile` drops the `services/assistant` type copies; tsconfig alias removed.
- Infra: `infrastructure/docker-compose.yml`, `infrastructure/nginx/nginx.conf`, `.github/workflows/pipeline.yml`, `.github/scripts/detect-changes.*`, root `package.json` dev scripts, dev-machine docs/spec, `CLAUDE.md` architecture section, `pnpm-lock.yaml`.
- Tests: assistant unit tests move with their code (vitest `unit`/`integration` projects of web); Microsoft/WhatsApp `server.tests.ts` run against the real logic with the external services mocked.
