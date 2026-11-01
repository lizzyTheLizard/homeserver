# web Specification

## Purpose

Defines the web application as a whole: the Next.js application that serves every page, how it authenticates and authorizes users, the shared design language and components its pages use, its error and event handling, and the shared database access every feature relies on.

## Requirements

### Requirement: The web application requires an authenticated session

Every request SHALL be authenticated before it is served, except for the authentication routes, the health endpoint and the static, PWA and well-known paths. A request without a valid session SHALL be redirected to the sign-in when it is a browser navigation and answered with an unauthorized response when it is an AJAX request.

#### Scenario: Unauthenticated browser request is redirected
- **WHEN** a browser requests a page without a valid session
- **THEN** the request is redirected to the identity provider's sign-in

#### Scenario: Unauthenticated AJAX request is refused
- **WHEN** a request carrying the AJAX request header arrives without a valid session
- **THEN** it is answered with an unauthorized response instead of a redirect

#### Scenario: Published paths are reachable
- **WHEN** the sign-in callback, the health endpoint or a static asset is requested without a session
- **THEN** the request is served

#### Scenario: The requested address is restored after sign-in
- **WHEN** a user reaches a page while unauthenticated and signs in
- **THEN** the browser returns to that page

#### Scenario: Published paths are not logged
- **WHEN** a request to a published path is served
- **THEN** the middleware serves it without logging it

#### Scenario: Signing out ends the session
- **WHEN** the user signs out
- **THEN** the session is cleared, an informational event is recorded and the browser is sent back to the sign-in

### Requirement: Features are gated by the applications in the session

The application SHALL record the applications a user may access in their session at sign-in and SHALL reject a request for a feature the session does not carry. The start page and CoEditor SHALL be granted to every user, the admin application only to the configured administrator's e-mail address, and the cash application only to a user who owns at least one cash project.

#### Scenario: Granted feature is served
- **WHEN** a session carries the application for the requested feature
- **THEN** the request is served

#### Scenario: Ungranted feature is refused
- **WHEN** a session does not carry the application for the requested feature
- **THEN** the request is refused

#### Scenario: Every user gets the start page and CoEditor
- **WHEN** any user signs in
- **THEN** their session carries the start page and CoEditor applications

#### Scenario: Cash follows project ownership
- **WHEN** a user who owns no cash project signs in
- **THEN** their session does not carry the cash application

#### Scenario: The grant set is fixed for the session
- **WHEN** a user's applications change while their session is still valid
- **THEN** the change takes effect only after they sign in again

#### Scenario: Ungranted applications are not offered
- **WHEN** the navigation renders
- **THEN** only the applications the session carries are shown

### Requirement: The web application uses a shared design language

The web application's pages SHALL use one design language defined by shared CSS custom properties: a white page background, black default text, the generic sans-serif font family, and the application's shared spacing, border-radius and card layout, so that shared components render identically on every page.

#### Scenario: Pages share the design language
- **WHEN** a user opens any of the application's pages
- **THEN** the page renders with the shared background, typography and colour scheme taken from the shared custom properties

#### Scenario: Shared components look the same everywhere
- **WHEN** a page renders a shared component such as a button, input, table or sidebar
- **THEN** it appears with the same styling as on the other pages

### Requirement: Data changes go through server actions

Mutating an entity SHALL go through the page's server action, which SHALL authenticate the user against the application it belongs to, validate the input and answer with either the changed entity or an error the caller can display.

#### Scenario: A valid change succeeds
- **WHEN** a user submits a valid change
- **THEN** the server action applies it and answers with the changed entity

#### Scenario: An invalid change is reported
- **WHEN** a user submits a change that fails validation
- **THEN** the server action answers with an error naming the invalid field and applies nothing

#### Scenario: An unauthenticated change is refused
- **WHEN** a change is submitted without a valid session
- **THEN** the server action answers with an unauthorized error and applies nothing

### Requirement: Errors are reported with a status the caller can act on

A failing operation SHALL be reported as an error carrying a status code and a message the caller may display: bad request for invalid input, unauthorized for a missing session, forbidden for a missing permission, not found for a missing record and internal error for an unexpected failure. An unexpected failure SHALL be logged with its stack, while an expected failure SHALL not be.

#### Scenario: Invalid input is a bad request
- **WHEN** an operation rejects invalid input
- **THEN** the error carries the bad-request status and the validation message

#### Scenario: A missing record is not found
- **WHEN** an operation targets a record that does not exist
- **THEN** the error carries the not-found status

#### Scenario: An unexpected failure is logged
- **WHEN** an operation fails unexpectedly
- **THEN** the error carries the internal-error status and the failure is logged with its stack

### Requirement: Notable changes are recorded in the event log

The application SHALL record notable changes and failures as events carrying a time, a level and a message, and SHALL expose the recent events to the admin application.

#### Scenario: A change is recorded
- **WHEN** a feature creates, changes or deletes a record
- **THEN** an informational event naming the affected record is recorded

#### Scenario: A failed action is recorded
- **WHEN** a server action fails
- **THEN** an event at warning or error level describing the failure is recorded

### Requirement: The database schema is kept current by migrations

The application SHALL keep the database schema current by running the versioned migration files in order inside a transaction, before the first database use, and SHALL refuse to proceed when an already-applied migration has been changed or removed, or when a new migration is ordered before one that already ran. A migration file whose name carries the temporary prefix SHALL be executed without being recorded.

#### Scenario: Pending migrations are applied
- **WHEN** the application first touches a database with pending migrations
- **THEN** those migrations are applied in file order

#### Scenario: Changed migration stops the application
- **WHEN** an already-applied migration has been changed or removed
- **THEN** the migration run fails instead of continuing against an inconsistent schema

#### Scenario: Out-of-order migration is refused
- **WHEN** a pending migration is ordered before an already-applied one
- **THEN** the migration run fails

#### Scenario: A temporary migration is not recorded
- **WHEN** a migration file carries the temporary prefix
- **THEN** it is executed but not recorded as applied

### Requirement: The database is reached through one shared pool

The application SHALL open one PostgreSQL connection pool per process, SHALL expose transactional and non-transactional access to it, and SHALL keep dates as strings and numerics as numbers when reading rows.

#### Scenario: One pool per process
- **WHEN** several features reach the database
- **THEN** they share the process's single pool

#### Scenario: A transactional access either commits or rolls back
- **WHEN** a unit of work fails inside a transactional access
- **THEN** its changes are rolled back
