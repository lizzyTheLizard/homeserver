# Spec Delta

## ADDED Requirements

### Requirement: Short-lived wacli commands have a bounded default timeout

The bridge SHALL abort a short-lived wacli command that does not finish within `WHATSAPP_CMD_TIMEOUT_MS`, which defaults to 5000 ms and remains configurable. The abort SHALL fail the command rather than leave it hanging.

#### Scenario: Hung short command is aborted at the default timeout

- **WHEN** a short-lived wacli command does not finish within 5000 ms under the default configuration
- **THEN** the bridge kills the command and reports it as failed

#### Scenario: Configured timeout overrides the default

- **WHEN** `WHATSAPP_CMD_TIMEOUT_MS` is configured to a different value
- **THEN** short-lived wacli commands are aborted after that value instead of 5000 ms

### Requirement: At most one short-lived wacli command per store

The bridge SHALL allow at most one short-lived wacli command per user store at a time. While a short-lived command is running for a store, the bridge SHALL reject any further short-lived command for that store immediately, without running it. Stores are independent: activity in one store SHALL NOT reject commands in another.

#### Scenario: Second concurrent short command is rejected

- **WHEN** a short-lived command is running for a store and another short-lived command is requested for the same store
- **THEN** the second command fails immediately without being executed

#### Scenario: Different stores do not block each other

- **WHEN** a short-lived command is running for one store and a short-lived command is requested for another store
- **THEN** the second command is accepted and may run concurrently

### Requirement: A long-running wacli process waits for a running short command

The bridge SHALL NOT start a long-running wacli process for a store while a short-lived command for that store is still running. The long-running process SHALL wait until the short-lived command has finished, and SHALL start without delay when no short-lived command is running. A full sync is subject to the same rule.

#### Scenario: Long-running process waits for the short command

- **WHEN** a long-running wacli process is requested for a store while a short-lived command is running for that store
- **THEN** the long-running process starts only after the short-lived command has finished

#### Scenario: Long-running process starts without waiting when idle

- **WHEN** a long-running wacli process is requested for a store and no short-lived command is running for it
- **THEN** the long-running process starts without waiting

### Requirement: Errors from a stopped wacli process are ignored

The bridge SHALL ignore an error reported by a wacli process that is no longer tracked as running — either because it is being stopped deliberately or because it has already stopped — and SHALL NOT change the session status or report the error to callers in response.

#### Scenario: Error while stopping is ignored

- **WHEN** a session is being stopped deliberately and its wacli process reports an error
- **THEN** the session status does not change and no error is reported

#### Scenario: Error after the process stopped is ignored

- **WHEN** a wacli process has already stopped and a late error event arrives for it
- **THEN** the session status does not change and no error is reported

### Requirement: wacli warning events are logged at warn level

The bridge SHALL log every wacli warning event at warn level, including its code and message, without changing the session status in response.

#### Scenario: Warning is logged without failing the session

- **WHEN** a wacli warning event arrives on a running session
- **THEN** the bridge logs it at warn level and the session remains in its current state

### Requirement: LTHash mismatch warnings are surfaced as session errors

The bridge SHALL treat a wacli warning whose message contains `hit an LTHash mismatch` as a session error. The session SHALL become closed with that message so that a pending start request fails, and the bridge SHALL leave wacli's own recovery behaviour untouched.

#### Scenario: LTHash mismatch fails the pending start request

- **WHEN** a session is starting and a warning containing `hit an LTHash mismatch` arrives from its wacli process
- **THEN** the session becomes closed with that message and the start request fails

#### Scenario: LTHash mismatch after shutdown is ignored

- **WHEN** a session is being stopped or its wacli process has already stopped and a warning containing `hit an LTHash mismatch` arrives
- **THEN** the session status does not change

#### Scenario: Other warnings do not fail the session

- **WHEN** a warning whose message does not contain `hit an LTHash mismatch` arrives
- **THEN** the session remains in its current state
