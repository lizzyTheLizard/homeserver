# Spec Delta

## ADDED Requirements

### Requirement: The assistant owns its prefixed database schema

The assistant SHALL store its own persisted data in the shared database under an `assistant_` table-name prefix, SHALL apply its own migration files at startup before serving requests, and SHALL keep the Microsoft token for a user in a prefixed table it migrates itself. It SHALL NOT require any data created by the web application's migrations.

#### Scenario: The assistant migrates its own schema
- **WHEN** the assistant starts against a shared database without its tables
- **THEN** it applies its own migrations to create the `assistant_`-prefixed tables before serving requests

#### Scenario: The Microsoft token is stored under the assistant prefix
- **WHEN** the assistant reads or writes a user's Microsoft token
- **THEN** it uses its own `assistant_`-prefixed token table, not the web application's former token table

#### Scenario: The assistant does not depend on the web application's migrations
- **WHEN** the assistant starts against a database that has no web-application migrations applied
- **THEN** the assistant still starts and serves requests using only its own prefixed tables
