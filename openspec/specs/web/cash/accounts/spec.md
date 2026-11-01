# web/cash/accounts Specification

## Purpose

Defines the cash chart of accounts: creating, editing and deleting the accounts of a project, the effect of archiving an account, and the ledger consequences of deleting one.

## Requirements

### Requirement: Accounts belong to a project and have a type

Every account SHALL belong to exactly one cash project and SHALL have a non-blank name, a type from the supported list and an archived flag.

#### Scenario: Created account carries its type
- **WHEN** a user creates an account with a name and a type
- **THEN** the account appears in the project's accounts with that name and type

#### Scenario: Blank name is rejected
- **WHEN** a user saves an account whose name is empty or only whitespace
- **THEN** the save is rejected

#### Scenario: Unknown type is rejected
- **WHEN** a user saves an account with a type outside the supported list
- **THEN** the save is rejected

### Requirement: Accounts are listed by name and can be edited and deleted

The accounts page SHALL list the project's accounts ordered by name, including archived ones, and SHALL let the user edit an account's name, type and archived flag or delete the account.

#### Scenario: Accounts are listed alphabetically
- **WHEN** the accounts page opens
- **THEN** the project's accounts are listed in name order, archived accounts included

#### Scenario: Editing an account of the user's project succeeds
- **WHEN** the user saves changes to an account of one of their projects
- **THEN** the account is updated

#### Scenario: Editing another user's account fails
- **WHEN** a save targets an account that does not belong to the user or not to the addressed project
- **THEN** the save fails

### Requirement: Deleting an account removes its ledger entries

Deleting an account SHALL also remove the transactions, closings, ledger entries and monthly closings that reference it, and SHALL not recalculate the accounts that were on the other side of those transactions.

#### Scenario: Account deletion removes its transactions
- **WHEN** an account that is used by transactions is deleted
- **THEN** those transactions are gone

#### Scenario: Account deletion removes its monthly closings
- **WHEN** an account that a monthly closing references is deleted
- **THEN** those monthly closings are gone

#### Scenario: Counterpart accounts are not recalculated
- **WHEN** deleting an account removes transactions that referenced another account
- **THEN** that other account's ledger is left as it was

### Requirement: Archived accounts remain visible but cannot be booked

An archived account SHALL remain listed on the accounts page, SHALL be excluded from the account choices offered when booking a transaction, filtering the account journal or importing a monthly closing, and SHALL NOT be offered as a link to a new booking from a report.

#### Scenario: Archived account is listed
- **WHEN** the accounts page renders the project's accounts
- **THEN** archived accounts are shown

#### Scenario: Archived account cannot be selected
- **WHEN** the user books a transaction, narrows the account journal or imports a monthly closing
- **THEN** archived accounts are not offered

### Requirement: Opening balances are derived from earlier entries

Cash SHALL derive an account's opening balance for a period from the account's most recent ledger entry before that period, and SHALL show it as a non-editable Opening Balance row on the account journal of a summation account that has such an entry.

#### Scenario: Opening balance row on a summation account
- **WHEN** a summation account has ledger entries before the selected period
- **THEN** its account journal shows a non-editable Opening Balance row carrying that balance

#### Scenario: No earlier entries means no opening row
- **WHEN** the account has no ledger entry before the selected period
- **THEN** no opening-balance row is shown
