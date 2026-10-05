# Proposal

## Why

The bridge (`whatsapp-bridge/companion/`) drives one wacli process per user and interleaves a long-running `sync --follow` process with short one-shot commands against the same SQLite store. That interleaving is currently uncoordinated: a short command may still be running when the long process starts, two short commands can run concurrently, a short command can hang for 30 seconds before it is killed, errors that arrive after a process has already stopped still mark the session as failed, and wacli `warning` events — including app-state LTHash mismatches — are dropped at debug level. The result is occasional bridge hangs and sessions reported as healthy while the local mirror is inconsistent (issue #383).

## What Changes

- Lower the default `WHATSAPP_CMD_TIMEOUT_MS` from 30000 to 5000 (code and README), keeping it configurable.
- `Supervisor.handleEvent` ignores an `error` event when the process is already gone (`this.child === null`), in addition to the existing `this.isStopping` guard.
- Per-store command coordination in `wacli.ts`: while a short-lived `runWacli` command is in flight for a store, a long-running `spawnWacli` process waits for it to finish, and a second short-lived command for that store is rejected immediately instead of running concurrently. `Supervisor.fullSync`'s long `runWacli` participates in the same coordination.
- `WacliEvent` gains a `warning` variant (`{ code?, message, name? }`), and `attachEventParser` logs warning events at warn level.
- A warning whose message contains `hit an LTHash mismatch` is treated as an error: the session becomes `closed` with that message so the pending start request fails, while wacli's own recovery-snapshot behaviour is left untouched.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `whatsapp-bridge`: adds requirements for the bounded short-command timeout, per-store command coordination (long process waits, concurrent short commands rejected), ignoring post-shutdown errors, and warn-level handling of wacli warning events including the LTHash-mismatch error case.

## Impact

- `whatsapp-bridge/companion/config.ts` — timeout default.
- `whatsapp-bridge/companion/wacli.ts` — `warning` event type, warn-level event logging, per-store short/long command coordination, `spawnWacli` becomes asynchronous.
- `whatsapp-bridge/companion/supervisor.ts` — awaits `spawnWacli`, ignores late errors, treats LTHash-mismatch warnings as errors.
- `whatsapp-bridge/companion/supervisor.tests.ts`, plus a new `whatsapp-bridge/companion/wacli.tests.ts` for the parser and coordination.
- `whatsapp-bridge/README.md` — documented timeout default.
- No REST surface change: the assistant and web app already receive the 500 produced when a start request fails (`server.ts`), and the bridge container is rebuilt and redeployed.
- Out of scope (from the issue): any change to wacli itself, automatic retry/restart after a session error, other limits/defaults, and the assistant's WhatsApp skill.
