## ADDED Requirements

### Requirement: External images in the stack are pinned to exact versions

Every image of the docker-compose stack that is not built from this repository SHALL be referenced with an exact version tag and never with `latest`, a missing tag or a floating major or minor tag. Images built from this repository SHALL be referenced with `latest`.

#### Scenario: Third-party image is pinned
- **WHEN** the compose file references an image that is not published from this repository, such as the proxies, databases, viewers, DNS server or certificate client
- **THEN** its tag names an exact version

#### Scenario: Own image follows the latest build
- **WHEN** the compose file references an image published as `ghcr.io/lizzythelizard/homeserver-*`
- **THEN** its tag is `latest`
