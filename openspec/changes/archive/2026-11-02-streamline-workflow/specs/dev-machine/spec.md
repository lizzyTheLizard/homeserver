## RENAMED Requirements

- FROM: `### Requirement: Remote Control sessions start in the repository`
- TO: `### Requirement: Remote Control sessions each get their own worktree`

## MODIFIED Requirements

### Requirement: Remote Control sessions each get their own worktree

The Remote Control server SHALL spawn each session it starts on demand in its own git worktree of the repository checkout in the development home. Concurrent sessions therefore SHALL NOT share a working directory or a checked-out branch. Each new worktree SHALL receive the repository's local, untracked environment configuration, so that the development scripts work in it without manual setup. The worktrees SHALL NOT show up as untracked files in the main checkout.

#### Scenario: Remote sessions start in the repository
- **WHEN** a developer starts a new session through Remote Control
- **THEN** the session is spawned in a new git worktree of the repository checkout in the development home, not in the main checkout itself

#### Scenario: Concurrent sessions do not interfere
- **WHEN** two sessions are running and one of them switches its branch
- **THEN** the other session's working directory and branch are unchanged

#### Scenario: Environment configuration is available in the worktree
- **WHEN** a session starts in a new worktree
- **THEN** the local environment configuration of the main checkout is present in the worktree

#### Scenario: Worktrees do not pollute the main checkout
- **WHEN** worktrees exist for running sessions
- **THEN** `git status` in the main checkout does not list them as untracked
