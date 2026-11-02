# Spec Delta

## MODIFIED Requirements

### Requirement: An infrastructure deploy recreates the whole stack

An infrastructure deploy SHALL force-recreate every service of the stack, including services whose definition did not change, and SHALL remove orphan containers of the stack, meaning containers whose service is no longer defined. The pipeline SHALL run it on the main branch whenever it reports the infrastructure as changed, after every changed service's image was published, and it SHALL replace that run's per-service deploys.

#### Scenario: Unchanged services are recreated
- **WHEN** an infrastructure deploy runs
- **THEN** every service of the stack is recreated, even when its configuration and image did not change

#### Scenario: Orphan containers are removed
- **WHEN** an infrastructure deploy runs and a container belongs to a service no longer defined in the stack
- **THEN** that container is removed

#### Scenario: A change to the deploy definition triggers a deploy
- **WHEN** a push to the main branch changes only the pipeline's workflow or one of its actions
- **THEN** an infrastructure deploy runs

#### Scenario: A change to the stack definition triggers a deploy
- **WHEN** a push to the main branch changes the stack definition or its mounted configuration
- **THEN** an infrastructure deploy runs

#### Scenario: New images are deployed with the stack
- **WHEN** a push to the main branch changes both the stack definition and the web application
- **THEN** the web application image is published first and the infrastructure deploy then recreates the whole stack with it, without a separate web deploy
