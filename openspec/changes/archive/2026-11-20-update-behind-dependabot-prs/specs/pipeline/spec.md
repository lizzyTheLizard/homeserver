# Spec Delta

## ADDED Requirements

### Requirement: Dependabot pull requests with armed auto-merge are kept up to date

After every push to the main branch, and when dispatched by hand, a workflow SHALL bring an open Dependabot pull request that is behind main and has auto-merge armed up to date with main, using the GitHub App identity so that the update starts the pipeline. It SHALL update at most one pull request per run, the oldest eligible one.

#### Scenario: A pull request that is behind is updated
- **WHEN** a commit reaches main and a Dependabot pull request with armed auto-merge is behind main
- **THEN** the workflow merges main into that pull request's branch and the pipeline runs for it

#### Scenario: Only the oldest eligible pull request is updated
- **WHEN** several Dependabot pull requests with armed auto-merge are behind main
- **THEN** only the oldest of them is updated in this run

#### Scenario: The next pull request follows after a merge
- **WHEN** the updated pull request passes its "Quality Gate" and auto-merge merges it into main
- **THEN** the resulting push to main updates the next eligible pull request

#### Scenario: An update that is already waiting is not followed by another
- **WHEN** a Dependabot pull request with armed auto-merge is up to date and its checks have not failed
- **THEN** the workflow updates no other pull request in this run

#### Scenario: A failing pull request does not block the others
- **WHEN** the up-to-date pull request with armed auto-merge has a failed check
- **THEN** the workflow still updates the oldest eligible behind pull request

#### Scenario: Other pull requests are left alone
- **WHEN** a pull request is not from Dependabot, has no armed auto-merge, or is not behind main
- **THEN** the workflow does not update it
