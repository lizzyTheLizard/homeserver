# Spec Delta

## Purpose

Binds every change to the branch named after it, so its plan, task commits and archive can only merge from that branch, and the change is still recognisable after it is archived.

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

### Requirement: Archiving keeps the change name

Archiving SHALL keep the change name as the suffix of the archived folder, at `openspec/changes/archive/<date>-<name>`, so the guard can still bind a branch to its change after the change has been archived.

#### Scenario: Archive folder keeps the name

- **WHEN** the change `branch-per-change` is archived
- **THEN** its folder path ends with `branch-per-change`, as in `openspec/changes/archive/2026-11-01-branch-per-change`
