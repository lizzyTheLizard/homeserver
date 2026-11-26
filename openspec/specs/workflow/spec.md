# workflow Specification

## Purpose

Defines how a change is handed over for review and merged: the user reviews the pushed branch on GitHub, and the archive step collects any follow-up work before opening the pull request.

## Requirements

### Requirement: Review on GitHub before archiving
After implementing all tasks of a change and passing lint and tests, the agent SHALL commit once and push the change branch without waiting for a local review and without opening a pull request, so that the user can review the diff on GitHub. The agent MUST NOT archive the change before the user asks for it.

#### Scenario: Apply ends with a pushed branch
- **WHEN** the last task of a change is done and lint and tests pass
- **THEN** the agent commits with the `OpenSpec-Change` and `Agent` trailers, pushes the branch, opens no pull request and asks the user to run the archive workflow after their review

### Requirement: Archive collects follow-up changes
Before the archive commit, the archive workflow SHALL commit and push any uncommitted changes made after the apply commit as a separate commit that contains no `openspec/` changes, so that the archive commit stays isolated to `openspec/`. It SHALL then open the pull request and follow it until it has merged.

#### Scenario: Review follow-up exists
- **WHEN** the working tree holds changes made after the apply commit when the user archives
- **THEN** those changes are committed and pushed first, the archive is committed and pushed afterwards, and the pull request is opened

#### Scenario: No follow-up exists
- **WHEN** the working tree is clean when the user archives
- **THEN** only the archive commit is created before the pull request is opened
