# Spec Delta

## MODIFIED Requirements

### Requirement: Pull requests carry only the archived change

The pipeline SHALL run the change guard for every pull request and SHALL fail it when the pull request adds or modifies an in-flight change folder under `openspec/changes/<name>/`. A pull request touching `openspec/changes/` MUST contain exactly one archived change, `openspec/changes/archive/<date>-<name>/`, whose `<name>` equals the head branch name, and for every delta spec `specs/<path>/spec.md` of that archived change the pull request MUST also change `openspec/specs/<path>/spec.md`.

#### Scenario: Unarchived change fails

- **WHEN** a pull request from branch `branch-per-change` adds `openspec/changes/branch-per-change/proposal.md`
- **THEN** the guard fails and tells the author to archive the change before opening the pull request

#### Scenario: Archived change passes

- **WHEN** a pull request from branch `branch-per-change` adds `openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md` and changes `openspec/specs/ci/change-guard/spec.md`
- **THEN** the guard passes

#### Scenario: Mismatched branch fails

- **WHEN** a pull request from branch `fix-stuff` adds `openspec/changes/archive/2026-11-01-branch-per-change/`
- **THEN** the guard fails and reports that the expected branch is `branch-per-change`

#### Scenario: Archived change without synced specs fails

- **WHEN** a pull request adds `openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md` but no path under `openspec/specs/`
- **THEN** the guard fails and reports that the main specs were not synced

#### Scenario: A delta synced into a different capability fails

- **WHEN** a pull request adds `openspec/changes/archive/2026-11-01-branch-per-change/specs/pipeline/spec.md` and `openspec/changes/archive/2026-11-01-branch-per-change/specs/ci/change-guard/spec.md` but changes only `openspec/specs/pipeline/spec.md`
- **THEN** the guard fails and names `openspec/specs/ci/change-guard/spec.md` as not synced

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

#### Scenario: A failing guard fails the quality gate

- **WHEN** the change guard fails for a pull request
- **THEN** the pipeline's "Quality Gate" fails and the pull request cannot merge

#### Scenario: The guard does not run on main

- **WHEN** the pipeline runs for a push to main or a manual dispatch
- **THEN** the change guard is skipped
