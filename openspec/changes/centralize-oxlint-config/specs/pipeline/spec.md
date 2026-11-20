## MODIFIED Requirements

### Requirement: The pipeline first detects what changed

The pipeline SHALL start by determining which of the web application, assistant, WhatsApp bridge, Wichteln and development machine services and whether the infrastructure changed, comparing a pull request against its base branch and a push to main against the previous main commit. All later stages SHALL act only on what this stage reports as changed.

#### Scenario: A change inside a service folder
- **WHEN** the compared commits change files under `services/<name>/` only
- **THEN** only that service is reported as changed

#### Scenario: A change to shared workspace files
- **WHEN** the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, the shared lint configuration `.oxlintrc.json` or the shared setup action changes
- **THEN** every service is reported as changed

#### Scenario: A change to the pipeline definition
- **WHEN** the pipeline's own workflow or any of its actions changes
- **THEN** every service and the infrastructure are reported as changed

#### Scenario: A change to the stack definition
- **WHEN** files under `infrastructure/` change
- **THEN** the infrastructure is reported as changed

#### Scenario: Nothing relevant changed
- **WHEN** the compared commits change only files outside services, infrastructure, shared workspace files and the pipeline, for example only `openspec/`
- **THEN** no service and no infrastructure is reported as changed

#### Scenario: The previous main commit cannot be compared
- **WHEN** a push to main has no comparable previous commit, for example the first push or a forced history rewrite
- **THEN** every service and the infrastructure are reported as changed

## ADDED Requirements

### Requirement: All packages are linted with one shared configuration

The web application, assistant, WhatsApp bridge and Wichteln SHALL be linted against a single lint configuration at the repository root. Settings that apply to only some services SHALL be scoped to those services within that configuration, and no package SHALL carry its own lint configuration file.

#### Scenario: Every package uses the same rules
- **WHEN** any package is linted
- **THEN** the shared root configuration applies, including its performance, style and curated restriction rules

#### Scenario: Service-specific rules stay scoped
- **WHEN** the assistant or the WhatsApp bridge is linted
- **THEN** React and Storybook rules are not applied to its files

### Requirement: Linting checks code formatting

The linting task SHALL check that code and style files follow the project's formatting conventions (2-space indentation, single quotes, no semicolons, a maximum line width, consistent whitespace and wrapping). Locally the linting task SHALL reformat non-conforming files; for CI it SHALL fail on them without changing files.

#### Scenario: A formatting violation fails CI lint
- **WHEN** a changed file uses double quotes or a wrong indentation and the linting task runs for CI
- **THEN** the lint job fails and reports the file

#### Scenario: A formatting violation is fixed locally
- **WHEN** the linting task runs locally on a file with such a violation
- **THEN** the file is rewritten to conform
