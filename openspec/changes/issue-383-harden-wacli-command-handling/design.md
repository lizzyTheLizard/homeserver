# Design

## Context

`wacli.ts` is the only place that starts wacli processes. `runWacli` spawns a short-lived one-shot command and resolves with its JSON envelope or rejects on non-zero exit/timeout; `spawnWacli` starts the long-running `sync --follow --events` (or `auth --events`) process and forwards its stderr NDJSON events to `Supervisor.handleEvent`. Both take a per-user `storeDir` (a SHA-256 of the userId under `WHATSAPP_DATA_DIR`) and there is currently no coordination between them. `Supervisor` holds the store through `runWacli` during `start()` (auth status), `getChats`, `getMessages`, `sendMessage`, `archiveChat`, `disconnect`, `fullSync`, and the webhook unarchive check. See proposal.md for the motivation and the delta spec for the required behavior.

Constraints that shape the approach:

- `Supervisor.stop()` needs a `ChildProcess` handle to signal, so the long-running process must be observable to the supervisor even though starting it may now wait.
- Short commands against a store must stay usable while the long-running `sync` process holds the store (that is how reads work today); only short-vs-long start ordering and short-vs-short overlap are being serialized.
- The bridge is a single Node process with one supervisor per user; coordination can be in-memory and per store.

## Goals / Non-Goals

**Goals:**

- Make long-process start and short-command execution deterministic per store, without blocking other users.
- Surface app-state LTHash mismatches as session errors without breaking wacli's own recovery.
- Keep the failure modes bounded (a stuck command ends in ≤ `WHATSAPP_CMD_TIMEOUT_MS`).

**Non-Goals:**

- Serializing short commands against the running `sync` process (today's supported concurrency is kept).
- Queueing or retrying rejected short commands.
- Any change to wacli's recovery snapshot, or to how the bridge lazily restarts a closed session.

## Decisions

### Warn logging in the parser, error classification in the supervisor

`attachEventParser` already decodes every NDJSON line. It gains `warning` to the `WacliEvent` union (`{ code?: string, message: string, name?: string }`) and logs warning events with `logger.warn` (code and message); all other events keep the existing `logger.debug`. `Supervisor.handleEvent` gets a `warning` case that treats a message containing `hit an LTHash mismatch` as fatal and otherwise returns `false`.

Returning `false` for a non-fatal warning is deliberate: `handleEvent`'s return value tells `Supervisor.start()` whether the event produced a terminal status, so a logged warning must not resolve or reject a pending start.

Alternatives considered:

- **Rewrite the warning into an `error` event inside the parser**: keeps the supervisor simpler, but the parser is transport-level and shared by any events-mode process; "is this fatal for this session?" is supervisor state, and rewriting would double-log the message.
- **Classify in `server.ts`**: the warning arrives on the process's stderr, not through any HTTP handler, so there is no request to fail there.

### Ignore errors once the process handle is gone

`handleEvent`'s `error` case returns early when `this.isStopping` **or** `this.child === null`. `closed` and `stop()` already set `this.child = null` before late events can be delivered, so a spawn `error` or a post-kill error can no longer flip an intentionally stopped session into `closed` with an error. The same guard is applied to the LTHash warning path so a mismatch arriving after shutdown is ignored.

### Per-store coordinator in `wacli.ts`

A module-level `Map<storeDir, StoreCoordinator>` owns one coordinator per store. Each coordinator holds a `shortRunning` flag and the pending waiters of long processes:

- `runWacli` claims the store synchronously (no `await` between check and set, so it is atomic in Node's single-threaded model). If `shortRunning` is already set it rejects immediately with a "command already running" error; otherwise it sets the flag and clears it — resolving every waiter — in a `finally`, whether the command resolves, rejects or times out.
- `spawnWacli` becomes `async`: it awaits the coordinator's wait-for-short-command promise (resolving immediately when idle) before spawning the process.

Per store, not global, because each user has an isolated SQLite store and a slow command for one user must not reject or delay another user's requests. Alternatives considered: a single global lock (serializes all users — rejected) and relying on wacli/SQLite locking (that contention is the hang being fixed).

`Supervisor.fullSync` calls `runWacli` for its one-off `sync --once`, so it participates in the same coordination without extra code; its long timeout is unaffected.

Reject-on-overlap rather than queue: a queue would let HTTP requests pile up behind a command that may run until the 5 s timeout, while an immediate error lets the existing error handler (`server.ts`) return at once. `Supervisor.getChats` and `getMessages` issue their `runWacli` calls sequentially, so they are unaffected by the stricter rule.

### `spawnWacli` returns a promise; `Supervisor.start()` awaits it

The wait makes `spawnWacli(storeDir, args, handleEvent): Promise<ChildProcess>`. In `start()`, the result promise is constructed first, then the spawn is started and `this.child` is assigned when the promise resolves:

```ts
return new Promise<Status>((res, rej) => {
  void spawnWacli(this.storeDir, args, event => { /* uses res/rej */ })
    .then(child => { this.child = child })
    .catch((err: unknown) => { rej(err instanceof Error ? err : Error(String(err))) })
})
```

Events can only be delivered after the process is spawned, which is after the promise exists, so `res`/`rej` are always in scope. `start()` and `stop()` both run under the supervisor's mutex, so `stop()` cannot interleave with the wait and the late `this.child` assignment cannot race a kill. The type change makes the compiler flag every call site; `supervisor.tests.ts` is the only other caller and its `wacli` mock must return a promise.

Alternative considered: keep `spawnWacli` synchronous and have the supervisor `await waitForShortCommands(storeDir)` before calling it. Rejected because it leaves `spawnWacli` itself unsafe for future callers and spreads store coordination outside `wacli.ts`.

### Default short-command timeout of 5000 ms

`WHATSAPP_CMD_TIMEOUT_MS` defaults to `5000` (config) and the README table is updated to match. 30 s allowed a stuck one-shot command to hold an HTTP request and, after this change, a starting long process. wacli's JSON reads answer from local SQLite and should not approach 5 s; the variable remains the escape hatch if a deployment needs longer.

### Tests

- `wacli.tests.ts` (new) mocks `node:child_process` to drive command lifecycles deterministically: a hanging `runWacli` is rejected while it is in flight, a `spawnWacli` started during that window spawns only after the short command settles, and `attachEventParser` (exported for the test) logs a `warning` line at warn level through a `Readable`.
- Each coordination test uses a distinct `storeDir` string so the module-level registry cannot leak state between tests.
- `supervisor.tests.ts` gains cases for the late-error guard (error after `closed` does not change status), a warning logged without failing the session, and an LTHash warning rejecting a pending `start()` with `{ type: 'closed', error: ... }`.

## Risks / Trade-offs

- **[Concurrent short commands now fail instead of waiting]** → The caller sees an immediate error rather than a delayed one; the assistant can retry. This is the behavior the issue asks for, and the existing 500 path reports it.
- **[A long process can wait forever if a short command never settles]** → `runWacli` always settles (timeout, exit or spawn error) and clears the flag in `finally`, so the wait is bounded by `WHATSAPP_CMD_TIMEOUT_MS` in practice.
- **[Coordinator entries are never removed]** → One small object per store, bounded by the number of users; acceptable for a single bridge process.
- **[Async `spawnWacli` changes a public helper's signature]** → Only `Supervisor.start()` calls it; the type change plus the updated mock keep this local and compiler-checked.
- **[LTHash mismatch closes the session]** → The next request lazily starts a new sync (`ensureStarted`), which is the existing behavior for a closed session; wacli's recovery snapshot continues independently, and no retry loop is added.
- **[Warning return value]** → A non-fatal warning returns `false`, so it can never resolve or reject an in-flight `start()`; only the LTHash mismatch returns `true` and closes the session.

## Migration Plan

- Rebuild and redeploy the `whatsapp-bridge` image (`tsc` build). No database, volume or REST-contract migration; all state is in-memory.
- Rollback: redeploy the previous image. Deployments that need the old timing can also set `WHATSAPP_CMD_TIMEOUT_MS=30000` without a code change.
