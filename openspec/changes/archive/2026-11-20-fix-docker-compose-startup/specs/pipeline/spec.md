## ADDED Requirements

### Requirement: The stack is started in the pipeline when the infrastructure changed

When the infrastructure is reported as changed, the pipeline SHALL start the whole docker-compose stack with `docker compose up` on a pipeline runner, using placeholder configuration values, and SHALL pass only when every container of the stack is running and, where it defines a health check, healthy within a bounded time. This stage SHALL perform no other check: no request to a service and no query to the name server. It SHALL run after the changed services' images were built and published, and SHALL be skipped when the infrastructure did not change. On main, the infrastructure deploy SHALL NOT run unless this stage passed, and a failure of this stage SHALL make the "Quality Gate" fail.

#### Scenario: A healthy stack passes
- **WHEN** the infrastructure changed and every container of the stack reaches the running and healthy state in time
- **THEN** the stack start-up stage passes

#### Scenario: A failing container fails the stage
- **WHEN** the infrastructure changed and a container exits or does not become healthy in time
- **THEN** the stage fails, the infrastructure deploy does not run and the "Quality Gate" fails

#### Scenario: Unchanged infrastructure skips the stage
- **WHEN** the infrastructure is not reported as changed
- **THEN** the stack start-up stage is skipped and does not block the "Quality Gate"

#### Scenario: A pull request starts the stack without deploying
- **WHEN** the pipeline runs for a pull request that changes the infrastructure
- **THEN** the stack is started on the runner and nothing is deployed
