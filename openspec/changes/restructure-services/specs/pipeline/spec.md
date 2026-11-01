# Spec Delta

## MODIFIED Requirements

### Requirement: The pipeline runs on every push, pull request and on demand

Each service SHALL have its own pipeline that runs when its `services/<name>/` folder changes and SHALL build and deploy that service's image only then, and a shared pipeline SHALL run the jobs that span services (change guard, lint and the stack smoke suite). The lint, test, build, smoke and deploy jobs SHALL NOT run on pull requests; a pull request SHALL run only the change guard (see `ci/change-guard`), which is therefore the check required to merge it.

#### Scenario: A push runs the pipeline
- **WHEN** a commit is pushed to any branch
- **THEN** the shared lint, test and build jobs run, and each changed service's pipeline builds and deploys its image

#### Scenario: A change to a service runs its own pipeline
- **WHEN** a commit changes files under a service's `services/<name>/` folder
- **THEN** that service's pipeline builds and deploys its image, and the other services' pipelines do not run

#### Scenario: A change outside a service folder runs only the shared jobs
- **WHEN** a commit changes no service folder but changes shared files
- **THEN** the shared jobs run and no per-service build or deploy runs

#### Scenario: A pull request runs only the change guard
- **WHEN** a pull request is opened or updated
- **THEN** only the change guard runs, and the per-service and shared lint, test, build, smoke and deploy jobs are skipped

#### Scenario: A manual run is possible
- **WHEN** a pipeline is dispatched by hand
- **THEN** the same jobs run as for a push

### Requirement: Four images are built on every push

The pipeline SHALL build the web application, the assistant, the WhatsApp bridge and the development machine as `linux/amd64` images named `homeserver:web`, `homeserver:assistant`, `homeserver:whatsapp` and `homeserver:dev-machine`, SHALL build each image only from its own service's workflow and folder, SHALL tag the web application image with the deployed revision's commit, branch, pipeline run and build time, and SHALL upload each image as a build artifact.

#### Scenario: All four images are built
- **WHEN** a push reaches the pipeline
- **THEN** all four images are built under their `homeserver:<name>` names and uploaded as artifacts

#### Scenario: A service's image is built only from its own folder
- **WHEN** a service's image is built
- **THEN** it is built from that service's `services/<name>/` folder and Dockerfile

#### Scenario: The application image carries its revision
- **WHEN** the web application image is built
- **THEN** it records the commit, branch, pipeline run and build time that produced it

## ADDED Requirements

### Requirement: Wichteln is built as its own image

The pipeline SHALL build the Wichteln app as a `linux/amd64` image named `homeserver:wichteln` from its own service's workflow and folder, and SHALL upload it as a build artifact.

#### Scenario: The Wichteln image is built
- **WHEN** a push changes the Wichteln service's folder
- **THEN** the `homeserver:wichteln` image is built from that folder and uploaded as an artifact
