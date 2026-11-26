## ADDED Requirements

### Requirement: Updates waiting for their minimum age do not block other updates

Renovate branches that exist only because their release is not yet old enough SHALL NOT use up the limit of open pull requests, so other updates are still proposed. The number of open pull requests SHALL stay limited.

#### Scenario: Many updates wait for their minimum age
- **WHEN** more updates are waiting for their minimum release age than the limit of open pull requests allows
- **THEN** further updates are still proposed and are not held back as rate-limited

#### Scenario: Open pull requests stay limited
- **WHEN** more updates are ready than the limit of open pull requests allows
- **THEN** only that many pull requests are open at once and the rest follow as they merge
