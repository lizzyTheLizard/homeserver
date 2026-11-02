# Spec Delta

## ADDED Requirements

### Requirement: An infrastructure deploy recreates the whole stack

An infrastructure deploy SHALL force-recreate every service of the stack, including services whose definition did not change, and SHALL remove orphan containers of the stack, meaning containers whose service is no longer defined. It SHALL run for every push to the main branch that changes the stack definition or the infrastructure deploy's own definition.

#### Scenario: Unchanged services are recreated
- **WHEN** an infrastructure deploy runs
- **THEN** every service of the stack is recreated, even when its configuration and image did not change

#### Scenario: Orphan containers are removed
- **WHEN** an infrastructure deploy runs and a container belongs to a service no longer defined in the stack
- **THEN** that container is removed

#### Scenario: A change to the deploy definition triggers a deploy
- **WHEN** a push to the main branch changes only the infrastructure workflow or its deploy action
- **THEN** an infrastructure deploy runs

#### Scenario: A change to the stack definition triggers a deploy
- **WHEN** a push to the main branch changes the stack definition or its mounted configuration
- **THEN** an infrastructure deploy runs
