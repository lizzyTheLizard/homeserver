# Spec Delta

## ADDED Requirements

### Requirement: Administrators reset any account's password from the account list

The app SHALL show the administrator a list of every account, including accounts that belong to no group, and SHALL let the administrator reset the password of any listed account there, with the same effect as a reset from a group page.

#### Scenario: Account list shows all accounts

- **WHEN** the administrator opens the account list
- **THEN** the app lists every account by name, ordered by name ignoring case, together with the names of the groups the account belongs to, and shows no wish text and no password

#### Scenario: Account without a group is listed

- **WHEN** an account belongs to no group, because it was removed from all its groups or its groups were deleted
- **THEN** the account still appears in the account list, marked as belonging to no group

#### Scenario: Password is reset from the account list

- **WHEN** the administrator resets an account's password from the account list
- **THEN** the app replaces the account's password with a newly generated one, shows the new password to the administrator once, marks the account as having to change its password, and the previous password no longer signs in to any group

#### Scenario: Account list is reachable from the administrator area

- **WHEN** the administrator opens the administrator overview
- **THEN** the app offers a link to the account list

#### Scenario: Account list is only for the administrator

- **WHEN** a visitor who is not signed in as administrator opens the account list or triggers a reset from it
- **THEN** the app shows no account data and resets no password

## MODIFIED Requirements

### Requirement: Participant passwords are never stored or shown in readable form

The app SHALL store account passwords only as salted one-way hashes, SHALL verify sign-ins against the hash, and SHALL NOT display a password anywhere except the newly generated password shown once to the administrator after a reset.

#### Scenario: Stored password is not readable

- **WHEN** an account is registered, its password is changed or its password is reset
- **THEN** the database holds only a salted hash of the password, and two accounts with the same password have different stored values

#### Scenario: Reset password is shown only once

- **WHEN** the administrator reloads the group page or the account list after a password reset
- **THEN** the generated password is no longer shown
