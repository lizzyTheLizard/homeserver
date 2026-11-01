# Spec Delta

## Purpose

Ensures a pull request only carries finished work: the change is archived, the archive keeps its name, and any spec deltas it holds are synced into the main specs.

## ADDED Requirements

### Requirement: Pull requests carry only the archived change

CI SHALL fail a pull request that adds or modifies an in-flight change folder under `openspec/changes/<name>/`. A pull request touching `openspec/changes/` MUST contain exactly one archived change, `openspec/changes/archive/<date>-<name>/`, whose `<name>` equals the head branch name, and when that archived change carries delta specs the pull request MUST also update `openspec/specs/`.

#### Scenario: Unarchived change fails

- **WHEN** a pull request from branch `branch-per-change` adds `openspec/changes/branch-per-change/proposal.md`
- **THEN** the guard fails and tells the author to archive the change before opening the pull request

#### Scenario: Archived change passes

- **WHEN** a pull request from branch `branch-per-change` adds `openspec/changes/archive/2026-11-01-branch-per-change/` and `openspec/specs/ci/change-guard/spec.md`
- **THEN** the guard passes

#### Scenario: Mismatched branch fails

- **WHEN** a pull request from branch `fix-stuff` adds `openspec/changes/archive/2026-11-01-branch-per-change/`
- **THEN** the guard fails and reports that the expected branch is `branch-per-change`

#### Scenario: Archived change without synced specs fails

- **WHEN** a pull request adds `openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md` but no path under `openspec/specs/`
- **THEN** the guard fails and reports that the main specs were not synced

#### Scenario: Archived change without deltas passes

- **WHEN** a pull request adds `openspec/changes/archive/2026-11-01-quick-fix/proposal.md` from branch `quick-fix` with no `specs/` directory and no path under `openspec/specs/`
- **THEN** the guard passes

#### Scenario: Pull request without a change is out of scope

- **WHEN** a pull request touches no path under `openspec/changes/` (for example a dependency bump)
- **THEN** the guard reports the pull request as out of scope and does not fail

#### Scenario: Two archived changes fail

- **WHEN** a pull request adds `openspec/changes/archive/2026-11-01-branch-per-change/` and `openspec/changes/archive/2026-11-01-other-change/`
- **THEN** the guard fails and reports that the branch names more than one change

#### Scenario: In-flight and archived changes together fail

- **WHEN** a pull request adds `openspec/changes/branch-per-change/` and `openspec/changes/archive/2026-11-01-branch-per-change/`
- **THEN** the guard fails because the change is not archived

### Requirement: Archiving keeps the change name

Archiving SHALL keep the change name as the suffix of the archived folder, at `openspec/changes/archive/<date>-<name>`, so the guard can still bind a branch to its change after the change has been archived.

#### Scenario: Archive folder keeps the name

- **WHEN** the change `branch-per-change` is archived
- **THEN** its folder path ends with `branch-per-change`, as in `openspec/changes/archive/2026-11-01-branch-per-change`
