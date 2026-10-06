# Spec Delta

## Purpose

Defines the web application as a whole: the Next.js application that serves every page, how it authenticates and authorizes users, the shared design language and components its pages use, and the shared database access every feature relies on.

## ADDED Requirements

### Requirement: The web application requires an authenticated session

Every page request SHALL be authenticated before it is served: a browser request without a valid session SHALL be sent to the identity provider's sign-in, an AJAX request without a valid session SHALL be answered with an unauthorized response, and the authentication endpoints and the health endpoint SHALL be reachable without a session.

#### Scenario: Unauthenticated browser request is redirected
- **WHEN** a browser requests a page without a valid session
- **THEN** the request is redirected to the identity provider's sign-in

#### Scenario: Unauthenticated AJAX request is refused
- **WHEN** an AJAX request arrives without a valid session
- **THEN** it is answered with an unauthorized response instead of a redirect

#### Scenario: Public endpoints are reachable
- **WHEN** the sign-in callback or the health endpoint is requested without a session
- **THEN** the request is served

### Requirement: Features are gated by the applications in the session

The application SHALL grant each feature to a user based on the applications recorded in their session, and SHALL reject a request for a feature the session does not carry.

#### Scenario: Granted feature is served
- **WHEN** a session carries the application for the requested feature
- **THEN** the request is served

#### Scenario: Ungranted feature is refused
- **WHEN** a session does not carry the application for the requested feature
- **THEN** the request is refused as unauthorized

### Requirement: The web application uses a shared design language

The web application's pages SHALL use one design language: a white background, deep navy headings and primary text, grey secondary text and the system font stack, using the application's shared spacing, border-radius and card-based layout tokens.

#### Scenario: Pages share the design language
- **WHEN** a user opens any of the application's pages
- **THEN** the page renders with the shared background, typography and colour scheme

#### Scenario: Shared components look the same everywhere
- **WHEN** a page renders a shared component such as a button, input, table or sidebar
- **THEN** it appears with the same styling as on the other pages

### Requirement: Data changes go through server actions

Mutating an entity SHALL go through the page's server action, which SHALL authenticate the user, validate the input and answer with either the changed entity or an error the caller can display.

#### Scenario: A valid change succeeds
- **WHEN** a user submits a valid change
- **THEN** the server action applies it and answers with the changed entity

#### Scenario: An invalid change is reported
- **WHEN** a user submits a change that fails validation
- **THEN** the server action answers with an error and applies nothing

#### Scenario: An unauthenticated change is refused
- **WHEN** a change is submitted without a valid session
- **THEN** the server action answers with an unauthorized error and applies nothing

### Requirement: The database schema is kept current by migrations

The application SHALL keep the database schema current by running versioned migrations at startup, and SHALL refuse to start when an already-applied migration has been changed or removed.

#### Scenario: Pending migrations are applied on startup
- **WHEN** the application starts against a database with pending migrations
- **THEN** those migrations are applied

#### Scenario: Changed migration stops startup
- **WHEN** the application starts and a previously applied migration has been changed or removed
- **THEN** startup fails instead of running with an inconsistent schema
