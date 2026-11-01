# web/admin Specification

## Purpose

Defines the admin application: the dashboard and metrics that report the instance's build, run, database and usage figures, the current-configuration view, and the administration of cash projects across all users.

## Requirements

### Requirement: Admin requires the administrator identity

The session SHALL carry the admin application only when the user's e-mail address matches the configured administrator address at sign-in, and every admin page and admin action SHALL require that application, rejecting every other user.

#### Scenario: Administrator is admitted
- **WHEN** the administrator opens an admin page or invokes an admin action
- **THEN** the page loads or the action runs

#### Scenario: Other users are rejected
- **WHEN** a user who is not the administrator opens an admin page or invokes an admin action
- **THEN** the request is rejected

#### Scenario: Admin membership is decided at sign-in
- **WHEN** the configured administrator address changes while a session is still valid
- **THEN** the existing session keeps its admin application until the user signs in again

#### Scenario: The admin entry is hidden from other users
- **WHEN** a signed-in user who is not the administrator opens the application navigation
- **THEN** the admin application is not offered

### Requirement: The dashboard reports the build the instance runs

The dashboard SHALL show the branch, the commit, the pipeline run and its origin, and the build time of the running instance, and SHALL link the branch, commit and pipeline run to their source.

#### Scenario: Build card shows the deployed revision
- **WHEN** the dashboard opens
- **THEN** the deployed branch, a shortened commit, the pipeline run and the build time are shown

#### Scenario: A locally built instance is labelled local
- **WHEN** the instance was not produced by a pipeline run
- **THEN** its origin is reported as local

### Requirement: The dashboard reports the running instance

The dashboard SHALL show an identifier of the running process, the time it started, its uptime and the environment it runs in.

#### Scenario: Run card shows uptime and environment
- **WHEN** the dashboard opens
- **THEN** the instance identifier, start time, a formatted uptime and the environment are shown

### Requirement: The dashboard summarizes configuration and usage

The dashboard SHALL link to the instance's configuration and to its metrics, and SHALL show the memory in use together with the day and last-30-days counts of CoEditor commands and cash transactions.

#### Scenario: Metrics summary is shown
- **WHEN** the dashboard opens
- **THEN** memory, CoEditor command counts and cash transaction counts for the day and the last 30 days are shown

### Requirement: The dashboard shows the recent events

The dashboard SHALL list the events of the last 24 hours, most recent first, with their time, level and message, and SHALL link to the full logs.

#### Scenario: Recent events are listed
- **WHEN** the dashboard opens and events exist from the last 24 hours
- **THEN** those events are listed with time, level and message, most recent first

### Requirement: Metrics report general system figures

The metrics page SHALL show the memory in use, the process uptime, the database connection time and the database migration time of the running instance.

#### Scenario: General metrics are shown
- **WHEN** the metrics page opens
- **THEN** memory, uptime and the database connection and migration times are shown

#### Scenario: Unavailable database timing is labelled
- **WHEN** a database phase timing is not available
- **THEN** the metric is labelled as not available instead of showing a number

### Requirement: Metrics report CoEditor and cash usage counts

The metrics page SHALL show, across all users, the number of CoEditor users, discussions and commands, and the number of cash users, projects, accounts and transactions. CoEditor SHALL report its totals together with the discussions and commands of the last 24 hours; cash SHALL report its totals together with the transactions of the last 24 hours, the last 30 days and the current calendar month.

#### Scenario: CoEditor counts are shown
- **WHEN** the metrics page opens
- **THEN** the totals and the last-24-hours discussion and command counts plus the number of CoEditor users are shown

#### Scenario: Cash counts are shown
- **WHEN** the metrics page opens
- **THEN** the cash user, project, account and transaction counts are shown, with day, 30-day and calendar-month transaction figures

### Requirement: Metrics reflect the state when the page is requested

The metrics and dashboard figures SHALL be computed when the page is requested and SHALL NOT refresh themselves while the page stays open.

#### Scenario: Figures do not change without a reload
- **WHEN** the user leaves the metrics page open
- **THEN** the figures stay as they were until the page is requested again

### Requirement: The config page shows the current environment with secrets masked

The config page SHALL list the running instance's environment entries grouped into categories, SHALL mask the value of every entry whose name matches the secret pattern `PASSWORD`, `SECRET`, `KEY`, `TOKEN`, `CREDENTIAL` or `DB_CONNECTION_STRING`, SHALL shorten values longer than eighty characters behind a control that reveals the full value, and SHALL offer a filter over the entries' names and values together with a toggle to reveal the secrets.

#### Scenario: Secret values are masked by default
- **WHEN** the config page opens
- **THEN** entries whose name matches the secret pattern show a mask instead of their value

#### Scenario: Secrets can be revealed
- **WHEN** the user activates the show-secrets control
- **THEN** the secret values become visible

#### Scenario: Long values are shortened
- **WHEN** an entry's value is longer than eighty characters
- **THEN** it is shown shortened with a control to reveal the full value

#### Scenario: Filtering narrows the list
- **WHEN** the user types into the filter
- **THEN** only entries whose name or value contains the text remain listed

### Requirement: Cash administration manages projects across all users

The cash administration SHALL list every user's projects and SHALL let the administrator create, change and delete them, including assigning a project to a different owner by e-mail address, and SHALL record an informational event for each change.

#### Scenario: All projects are listed
- **WHEN** the administrator opens the cash administration
- **THEN** the projects of all users are listed

#### Scenario: A project is created for a user
- **WHEN** the administrator saves a new project with an owner
- **THEN** the project exists for that owner

#### Scenario: A project is moved to another owner
- **WHEN** the administrator saves an existing project with a different owner
- **THEN** the project belongs to the new owner

#### Scenario: Deleting requires confirmation
- **WHEN** the administrator activates delete for a project
- **THEN** a confirmation is shown and nothing is deleted until the administrator confirms
