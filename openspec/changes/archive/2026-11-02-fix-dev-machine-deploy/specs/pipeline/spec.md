## MODIFIED Requirements

### Requirement: Changed services are deployed from main

The deploy SHALL run only for a run on the main branch, regardless of who started it, and only after the deployed service's lint, tests and image publish succeeded. A service that has no lint or test task, such as the development machine, SHALL be deployed once its image publish succeeded; its missing lint or test SHALL NOT block the deploy. For each changed service it SHALL synchronise the stack definition to the server, pull that service's published image and recreate only that service. Concurrent deploys on the server SHALL be serialised.

#### Scenario: Deploy publishes the stack
- **WHEN** the pipeline runs on main, the assistant is reported as changed and its image was published
- **THEN** the stack definition is synchronised to the server and the assistant's container is recreated from the new image

#### Scenario: A service without lint or tests is deployed
- **WHEN** the pipeline runs on main, only the development machine is reported as changed and its image was published
- **THEN** the development machine's container is recreated from the new image

#### Scenario: A failing check blocks the deploy
- **WHEN** a changed service's lint, tests or image build fail on main
- **THEN** that service is not deployed

#### Scenario: A dependabot merge deploys
- **WHEN** a dependency update from the dependency bot is merged and the pipeline runs on main for it
- **THEN** the changed services are deployed like for any other merge

#### Scenario: A pull request never deploys
- **WHEN** the pipeline runs for a pull request
- **THEN** no deploy runs

#### Scenario: An infrastructure change deploys the whole stack instead
- **WHEN** the infrastructure is reported as changed on main
- **THEN** no per-service deploy runs and the whole stack is deployed once after every changed image was published
