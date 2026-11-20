## MODIFIED Requirements

### Requirement: DNS is served authoritatively for the deployment's zone

The stack SHALL run an authoritative, non-recursive name server, from the Internet Systems Consortium's `bind9` image on the 9.20 release line, for the deployment's zone, whose address records point at the host address substituted at start-up. The zone file generated at start-up SHALL be readable by the name server process.

#### Scenario: Zone answers authoritatively
- **WHEN** a client queries a name in the deployment's zone
- **THEN** the name server answers authoritatively with the host's address

#### Scenario: Recursion is refused
- **WHEN** a client asks the name server to resolve a name outside its zone
- **THEN** the request is not resolved recursively

#### Scenario: The generated zone file is readable
- **WHEN** the name server container starts and generates the zone file from its template
- **THEN** the file is world-readable and the name server loads the zone without a permission error

### Requirement: External images in the stack are pinned to exact versions

Every image of the docker-compose stack that is not built from this repository SHALL be referenced with an exact version tag and never with `latest`, a missing tag or a floating major or minor tag. The only exception is the name server image, which SHALL be referenced with the `9.20` release-line tag because the publisher offers no finer pinned tag for it. Images built from this repository SHALL be referenced with `latest`.

#### Scenario: Third-party image is pinned
- **WHEN** the compose file references an image that is not published from this repository, such as the proxies, databases, viewers or certificate client
- **THEN** its tag names an exact version

#### Scenario: Name server follows its release line
- **WHEN** the compose file references the name server image
- **THEN** its tag is `9.20`

#### Scenario: Own image follows the latest build
- **WHEN** the compose file references an image published as `ghcr.io/lizzythelizard/homeserver-*`
- **THEN** its tag is `latest`
