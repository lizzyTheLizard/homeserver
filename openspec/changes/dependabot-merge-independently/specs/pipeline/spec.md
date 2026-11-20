## ADDED Requirements

### Requirement: Dependabot pull requests merge independently of each other

Patch and minor Dependabot pull requests SHALL merge as soon as their own "Quality Gate" has passed, regardless of how many other pull requests were merged into the main branch after they were opened or last updated. The main branch ruleset SHALL NOT require pull requests to be up to date with the main branch, while it SHALL keep "Quality Gate" as a required check. No workflow of this repository SHALL push commits to a Dependabot branch, so that Dependabot keeps managing its branches and rebases them itself when they conflict with main.

#### Scenario: Several pull requests are open
- **WHEN** several patch or minor Dependabot pull requests with a passed "Quality Gate" and armed auto-merge are open and one of them merges
- **THEN** the others are not blocked by the merge and merge without being updated first

#### Scenario: A pull request conflicts with main after another merge
- **WHEN** a merge to main leaves another Dependabot pull request with a merge conflict
- **THEN** Dependabot rebases it, the pipeline runs for it again, auto-merge is armed again and it merges after a passed "Quality Gate"

#### Scenario: Major updates stay manual
- **WHEN** Dependabot opens a major update
- **THEN** it is not merged automatically

#### Scenario: A failing combination does not reach the servers
- **WHEN** two merged updates together make a check on main fail
- **THEN** the pipeline run on main fails and nothing from that run is deployed

## REMOVED Requirements

### Requirement: Dependabot pull requests with armed auto-merge are kept up to date
**Reason**: Needed only while the ruleset required up-to-date branches; the workflow pushed commits to Dependabot branches, which stops Dependabot from rebasing them on conflicts.
**Migration**: Delete `.github/workflows/dependabot-update-branch.yml`, turn off the up-to-date policy in the main ruleset and recreate pull requests that already contain an update commit with `@dependabot recreate`.
