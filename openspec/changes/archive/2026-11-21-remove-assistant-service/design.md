# Design

## Context

Today (see proposal.md) the browser opens a WebSocket to the assistant service (`/ws/assistant`, proxied by nginx). The assistant validates the iron-session cookie itself, keeps conversations in process memory (5 min TTL after disconnect), runs per-user Microsoft mail/todo/calendar workers (in-memory caches with polling intervals and a 5 min inactivity shutdown), proxies WhatsApp to the bridge, and owns the table `assistant_microsoft_token` (migrated by its own `assistant_migrations`). The web app calls it via `ASSISTANT_INTERNAL_URL`, importing types through the `@assistant/*` alias. `services/web/app/shared/config.ts` already declares `AI_*` and `WHATSAPP_BRIDGE_URL`.

Chat answers take seconds to tens of seconds (tool loops, up to 10 steps) and are streamed token by token; the UI renders partial text and a "tool call" reset.

## Goals / Non-Goals

**Goals:**
- `services/assistant` is deleted; no logic, cookie handling or proxying remains outside `services/web`.
- Same chat UX (streaming, actions, greeting), same Microsoft/WhatsApp pages, same model, skills and tools.

**Non-Goals:**
- No change to the WhatsApp bridge, to the model/prompt content or to the tools' behavior.
- No persistence of conversations, no multi-instance web deployment.

## Decisions

**1. Synchronous HTTP chat, no bridge.** A route handler `app/startpage/assistant/chat/route.ts` accepts `POST` and answers with a streamed `application/x-ndjson` body, one event per line (`initialized`, `stream_response`, `tool_call`, `finished_response`, `got_actions`, `error`) — the existing event vocabulary, so the UI state machine is reused. Two request shapes: `{type:'start', location}` (creates the conversation, streams the greeting) and `{type:'message', uuid, message}`. Streaming a response is still "the answer is the response of the request"; it keeps the live token rendering without an async bridge. Alternatives: (a) buffered JSON response — simplest but the user stares at a spinner for the whole tool loop and loses the streaming UX; (b) keep the assistant as a dumb WebSocket bridge calling web REST — more moving parts, rejected as the user's fallback only. Server Actions cannot stream arbitrary NDJSON, hence a route handler. Auth: `getAuthenticatedUserSession('startpage')` (401 when missing).

**2. Conversation state stays server-side in memory** (`Map<uuid, {user, messages, tools, lastUsed}>` on `globalThis` so Next dev HMR keeps it), pruned after an idle lifetime (5 min as today, refreshed per request). A message for an unknown/expired uuid or one owned by another user returns 410; the client shows `reconnect-impossible` ("start a new chat"). Alternative: client resends full history each time (stateless) — loses tool-call context and re-trusts client-supplied history; rejected. One in-flight request per conversation; a second concurrent message returns 409.

**3. Client: `AiChatWebSocket.ts` → `AiChatConnection.ts`** using `fetch` + `ReadableStream` line parsing, same callbacks (`onNewMessage`, `onNewActions`, `onStateChange`, `onIncomingMessageChange`) and `ChatState` type. Reconnect/backoff states (`wait-for-reconnecting`, `reconnecting`, `automatic-reconnecting-exhausted`) are removed; a network/HTTP error shows an error message and returns to `ready` so the user can resend; the stall timer stays. `terminate()` aborts the request via `AbortController`. Abort mid-answer does not cancel the model call needlessly: the route passes `request.signal` to the model so cancelled requests stop spending tokens.

**4. Code layout in web** (conventions: `_`-prefixed non-route folders, exported functions first):
- `app/startpage/microsoft/_external/` — `graph.ts`, `mail.ts`, `todo.ts`, `calendar.ts`, `data.ts` (token access via `transactional`/`nontransactional` of the shared `db/access.ts`). `server.ts` calls these directly; the former REST route's validation/serialization moves into the actions. `callback/route.ts` calls `handleMicrosoftLoginCallback` with the session user.
- `app/startpage/whatsapp/_external/whatsapp.ts` — bridge client; `server.ts` calls it directly.
- `app/startpage/assistant/` — `chat/` (the route handler plus everything only it uses: conversation store, stream helper, assistant instance, greeting/context, tool registry, event types, system prompt), `_tools/` (per-service tool files; Microsoft/WhatsApp tools import from the folders above), `_skills/*/SKILL.md`, `_external/` (Groq model client, open-meteo, OpenStreetMap). `system.md` and skills sit beside the code.
- Types previously shared through `@assistant/...` are imported locally; the alias is removed.

**5. Static tool/skill registries instead of runtime directory scanning.** The assistant discovers `*-tools.ts` and skill directories with `readdir`/dynamic `import`, which does not survive Next bundling. Tools are registered via an explicit import list; skills are loaded with `fs` from a path included in the standalone trace (`outputFileTracingIncludes` for `_skills/**` and `system.md`). The spec behavior ("a skill per directory with a valid definition; malformed ones skipped") is preserved.

**6. Workers as process singletons.** Microsoft workers (caches + polling intervals + inactivity timeout) are kept in a `globalThis`-anchored registry keyed by user email so they are created once per process, also across dev HMR. They run only inside the single web container. Importing them from Server Actions and the chat route yields the same instances (same Node process).

**7. Database.** New web migration `180_assistant_microsoft_token.sql`: `CREATE TABLE IF NOT EXISTS assistant_microsoft_token (...)` with the same definition, so tokens written by the old service remain valid with no data copy, and fresh/PGlite databases get the table. The table keeps its name to avoid a risky rename; the leftover `assistant_migrations` table is harmless and may be dropped later. The web migrations never touch it otherwise.

**8. Config/infra.** `ASSISTANT_INTERNAL_URL` and the `@assistant/*` alias go. Web needs `AI_API_KEY`, `MICROSOFT_GRAPH_APPLICATION_ID/CLIENT_SECRET/ISSUER` (added to `config.ts`) and `WHATSAPP_BRIDGE_URL`; the web service in compose depends on the healthy bridge instead of the assistant. nginx: remove the `/ws/assistant` blocks and give the web `location /` a long `proxy_read_timeout`/`proxy_send_timeout`; no dedicated chat location is needed because the route sends `X-Accel-Buffering: no`, which makes nginx stream that one response unbuffered. Dev: `pnpm dev` no longer starts an assistant process.

**9. Dependencies.** Add `@microsoft/microsoft-graph-client` and `async-mutex` to web; `ai`, `@ai-sdk/groq`, `@js-temporal/polyfill`, `openid-client`, `iron-session`, `zod` are already there. `ws` and the assistant package disappear from the lockfile.

## Risks / Trade-offs

- [Lost conversation on web restart/redeploy] → Accepted (already true for the assistant); UI offers a new chat. Documented in the spec.
- [Long-lived streaming requests behind nginx/Next] → The route disables nginx buffering per response via `X-Accel-Buffering`, nginx's read timeout is raised, set `maxDuration`/no response compression for the route; verify in a dev-container run.
- [Background polling workers inside the web server compete with page rendering] → They are I/O-bound and already bounded by the inactivity timeout; keep that behavior.
- [Next bundling breaks file-based discovery / `__dirname`] → Decision 5; covered by a test that the registries contain all tools/skills and by a production build in the verification task.
- [Dropped mid-answer request is not resumable] → Accepted per the simplest-option goal; the error message tells the user to resend.
- [Moving ~4000 lines in one change] → Files are moved with history (`git mv`) and their tests move along; behavior is unchanged except the transport.

## Migration Plan

1. Deploy the web image containing the migration and logic while the old assistant container is still defined; both can share the token table meanwhile.
2. The same deployment removes the assistant service from compose; remove the stale container (`docker compose up --remove-orphans`) and the published image/package is simply no longer built.
3. Rollback: redeploy the previous web and assistant images; the token table is compatible in both directions.
