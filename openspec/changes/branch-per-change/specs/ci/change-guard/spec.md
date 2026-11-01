# Spec Delta

## Purpose

Binds every change to the branch named after it, so a change's plan, task commits and archive can only live on that branch and can only reach the default branch through a pull request.

## ADDED Requirements

### Requirement: Pull request branch matches its change

CI SHALL fail a pull request whose head branch name does not equal the change folder that pull request adds or modifies. A pull request is in scope only when it touches `openspec/changes/`, and in scope it MUST name exactly one change, either in flight or archived.

#### Scenario: Matching branch passes

- **WHEN** a pull request from branch `branch-per-change` adds `openspec/changes/branch-per-change/`
- **THEN** the guard passes

#### Scenario: Mismatched branch fails

- **WHEN** a pull request from branch `fix-stuff` adds `openspec/changes/branch-per-change/`
- **THEN** the guard fails and reports that the expected branch is `branch-per-change`

#### Scenario: Archived change still passes

- **WHEN** a pull request from branch `branch-per-change` adds only `openspec/changes/archive/2026-11-01-branch-per-change/`
- **THEN** the guard passes

#### Scenario: Pull request without a change is out of scope

- **WHEN** a pull request touches no path under `openspec/changes/` (for example a dependency bump)
- **THEN** the guard reports the pull request as out of scope and does not fail

#### Scenario: Two changes in one pull request fail

- **WHEN** a pull request from branch `branch-per-change` adds `openspec/changes/branch-per-change/` and `openspec/changes/other-change/`
- **THEN** the guard fails and reports that the branch names more than one change

### Requirement: Change artifacts never land on the default branch

The versioned git hooks SHALL reject a commit that stages paths under `openspec/changes/` or `openspec/specs/` while the default branch is checked out, and SHALL reject a push that would update the default branch.

#### Scenario: Change commit on the default branch is rejected

- **WHEN** a commit staging `openspec/changes/branch-per-change/proposal.md` is attempted on `main`
- **THEN** the commit is rejected with a message naming the branch that the change requires

#### Scenario: Push to the default branch is rejected

- **WHEN** a push would update `refs/heads/main` on `origin`
- **THEN** the push is rejected and suggests opening a pull request instead

#### Scenario: Commit on the change branch is allowed

- **WHEN** a commit staging `openspec/changes/branch-per-change/tasks.md` is attempted on branch `branch-per-change`
- **THEN** the commit is allowed

#### Scenario: Specs are not committed on the default branch

- **WHEN** a commit staging `openspec/specs/ci/change-guard/spec.md` is attempted on `main`
- **THEN** the commit is rejected

### Requirement: Archiving keeps the change name

Archiving SHALL keep the change name as the suffix of the archived folder, at `openspec/changes/archive/<date>-<name>`, so the guard can still bind a branch to its change after the change has been archived.

#### Scenario: Archive folder keeps the name

- **WHEN** the change `branch-per-change` is archived
- **THEN** its folder path ends with `branch-per-change`, as in `openspec/changes/archive/2026-11-01-branch-per-change`
