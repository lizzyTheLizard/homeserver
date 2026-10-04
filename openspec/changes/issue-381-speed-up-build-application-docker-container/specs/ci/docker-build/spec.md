# Spec Delta

## Purpose

Defines the caching and performance behavior of the application Docker image build in CI, so a push that does not change the web application does not re-do slow work and the build completes within a bounded time while still producing a production-runnable image.

## ADDED Requirements

### Requirement: Cached application image build

The CI application image build SHALL cache each build stage's output so that a push with no change to the web application's dependency manifests reuses previously installed dependencies instead of re-installing them, and no change to the web sources reuses the previously built output instead of rebuilding it.

#### Scenario: No source change reuses cached build
- **WHEN** a push reaches the application image build with no change to the web sources or dependency manifests since the last build that populated the cache
- **THEN** the build reuses the cached dependency install and cached build output without re-running them

#### Scenario: Source change rebuilds only what changed
- **WHEN** a push changes the web sources but not the dependency manifests
- **THEN** the dependency install is reused from cache and only the build of the changed sources runs

### Requirement: Cache export does not dominate the build

The CI application image build SHALL export only the cache layers needed for the next build rather than every intermediate stage, so the cache export is not the largest line item in the build job.

#### Scenario: Cache export is bounded
- **WHEN** the application image build runs
- **THEN** the time spent exporting cache is below the time spent performing the actual dependency install and build

### Requirement: Production-runnable image is preserved

The CI application image build SHALL continue to produce a valid, production-runnable `homeserver:latest` image that the smoke suite and deploy jobs load and run exactly as before.

#### Scenario: Image loads and runs unchanged
- **WHEN** the application image build completes
- **THEN** the exported image starts the web application and serves traffic, and the smoke suite and deploy jobs function identically to before the caching and output changes
