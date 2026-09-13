## Purpose

Ensures the CI pipeline boots the full docker-compose stack and smoke-tests it before any deploy starts, and exposes a single aggregated status check that is the only check required to merge a PR.

## ADDED Requirements

### Requirement: Smoke suite runs before deploy on every push
The pipeline SHALL build the application, WhatsApp bridge, and assistant images on every push. The pipeline SHALL run a stack smoke suite that depends on those three build jobs, and the deploy job SHALL depend on the smoke suite, so the suite passes before the deploy step starts.

#### Scenario: Broken build blocked before deploy
- **WHEN** a push builds all images but the stack smoke suite fails
- **THEN** the deploy job does not start and the workflow run reports failure

#### Scenario: Green run deploys
- **WHEN** all build jobs and the stack smoke suite pass on the main branch
- **THEN** the deploy job runs

#### Scenario: Smoke suite tests the built images
- **WHEN** the smoke suite job starts
- **THEN** it downloads and loads the image artifacts produced by the build jobs and boots the stack with exactly those images, without rebuilding them

### Requirement: Single required merge check
The workflow SHALL expose one aggregated job, "All Build Check Success", that depends on every testing, linting, and building job in the pipeline, including the stack smoke suite. This aggregated job SHALL be the only status check required to merge a pull request.

#### Scenario: Aggregated check passes when all jobs pass
- **WHEN** every testing, linting, and building job (including the smoke suite) passes
- **THEN** "All Build Check Success" passes and the pull request is mergeable

#### Scenario: Aggregated check blocks merge on any failure
- **WHEN** any testing, linting, or building job (including the smoke suite) fails
- **THEN** "All Build Check Success" fails and the pull request is not mergeable
