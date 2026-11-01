# Spec Delta

## MODIFIED Requirements

### Requirement: The pipeline runs the checks in order on every push

The pipeline SHALL run linting, the test suites and the Docker image builds for the application, the assistant, the WhatsApp bridge, the Wichteln app and the development machine, and SHALL run the deploy only after those checks and the stack smoke suite have passed.

#### Scenario: Checks run before deploy

- **WHEN** a push reaches the pipeline
- **THEN** linting, the test suites and the image builds run, and the deploy does not start before they and the smoke suite pass

#### Scenario: Wichteln is checked like the other apps

- **WHEN** a push reaches the pipeline
- **THEN** the Wichteln package is linted and tested and its image is built alongside the application, assistant, WhatsApp bridge and development-machine builds

#### Scenario: A failing check stops the run

- **WHEN** linting, testing, an image build or the smoke suite fails
- **THEN** the dependent jobs, including the deploy, do not run

#### Scenario: Deploy publishes the stack

- **WHEN** the pipeline runs on the main branch with every check and the smoke suite green
- **THEN** the deploy synchronises the stack and the built images to the server, recreates the services and waits for them to report running or healthy

### Requirement: Production-runnable images are preserved

The CI image builds SHALL continue to produce valid, production-runnable `homeserver:latest`, `homeserver-assistant:latest`, `whatsapp-bridge:latest` and `homeserver-wichteln:latest` images that the smoke suite and deploy jobs load and run exactly as before.

#### Scenario: Images load and run unchanged

- **WHEN** the image builds complete
- **THEN** the exported images start their services and serve traffic, and the smoke suite and deploy jobs function identically to before the caching and output changes

### Requirement: Smoke suite runs before deploy on every push

The pipeline SHALL build the application, WhatsApp bridge, assistant, Wichteln and development-machine images on every push. The pipeline SHALL run a stack smoke suite that depends on those five build jobs, and the deploy job SHALL depend on the smoke suite, so the suite passes before the deploy step starts.

#### Scenario: Broken build blocked before deploy

- **WHEN** a push builds all images but the stack smoke suite fails
- **THEN** the deploy job does not start and the workflow run reports failure

#### Scenario: Green run deploys

- **WHEN** all build jobs and the stack smoke suite pass on the main branch
- **THEN** the deploy job runs

#### Scenario: Smoke suite tests the built images

- **WHEN** the smoke suite job starts
- **THEN** it downloads and loads the image artifacts produced by the build jobs and boots the stack with exactly those images, without rebuilding them

### Requirement: Infrastructure service checks

The suite SHALL assert that SSH on port 2222 accepts TCP connections, bind9 answers DNS queries, Dozzle serves its UI over HTTPS with a 200 response, Pgweb serves its UI, the application container is healthy and its `/shared/ping` endpoint responds, the application root page is reachable over HTTPS through nginx, and the Wichteln app root page is reachable over HTTPS through nginx. Each check SHALL report the name of the service it targets.

#### Scenario: Service down fails its own check clearly

- **WHEN** a specific service is unreachable or unhealthy
- **THEN** the check for that service fails with a message naming the service, while the remaining checks still report their own outcomes

#### Scenario: Wichteln is reachable through nginx

- **WHEN** the smoke suite runs against the stack
- **THEN** a request to the Wichteln hostname over HTTPS reaches the Wichteln app and answers instead of erroring out
