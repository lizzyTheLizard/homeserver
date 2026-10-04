# ci/docker-build Specification

## Purpose

Defines the caching and performance behavior of the CI Docker image builds, so a push that does not change a service's sources does not re-do slow work and each build completes within a bounded time while still producing production-runnable images.

## Requirements

### Requirement: Cached image builds

The CI image builds SHALL cache each build stage's output so that a push with no change to a service's dependency manifests reuses previously installed dependencies instead of re-installing them, and no change to the sources reuses the previously built output instead of rebuilding it.

#### Scenario: No source change reuses cached build

- **WHEN** a push reaches an image build with no change to that service's sources or dependency manifests since the last build that populated the cache
- **THEN** the build reuses the cached dependency install and cached build output without re-running them

#### Scenario: Source change rebuilds only what changed

- **WHEN** a push changes a service's sources but not its dependency manifests
- **THEN** the dependency install is reused from cache and only the build of the changed sources runs

### Requirement: Cache export does not dominate the build

The CI image builds SHALL export only the cache layers needed for the next build rather than every intermediate stage, so the cache export is not the largest line item in each build job.

#### Scenario: Cache export is bounded

- **WHEN** an image build runs
- **THEN** the time spent exporting cache is below the time spent performing the actual dependency install and build

### Requirement: Production-runnable images are preserved

The CI image builds SHALL continue to produce valid, production-runnable `homeserver:latest`, `homeserver-assistant:latest`, and `whatsapp-bridge:latest` images that the smoke suite and deploy jobs load and run exactly as before.

#### Scenario: Images load and run unchanged

- **WHEN** the image builds complete
- **THEN** the exported images start their services and serve traffic, and the smoke suite and deploy jobs function identically to before the caching and output changes
