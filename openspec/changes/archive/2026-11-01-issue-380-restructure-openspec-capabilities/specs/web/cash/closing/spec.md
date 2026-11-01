# Spec Delta

## Purpose

Defines cash closing: the monthly closings that lock a period, how profit is carried to the capital account, how a period is reopened, and the monthly closing workflow driven from the closing page.

## ADDED Requirements

### Requirement: Closing a period writes one closing per month

Closing a period SHALL write one closing per month, from the month after the project's latest closing — or the month of the oldest transaction, or the period's first month when neither exists — through the period's last month. Each closing SHALL be dated the last day of its month and SHALL carry the month's profit, computed as income minus expense, against the chosen capital and profit accounts.

#### Scenario: Closing a year writes twelve closings
- **WHEN** a year period is closed and no earlier closing exists
- **THEN** one closing per month of that year is written, each dated the last day of its month

#### Scenario: Profit is income minus expense
- **WHEN** a closing is written for a month
- **THEN** its profit equals that month's income minus that month's expense

#### Scenario: Closing continues after the latest closing
- **WHEN** a later period is closed after an earlier closing exists
- **THEN** the closings start with the month after the latest closing

### Requirement: A closing locks the transactions up to its date

Once a project has a closing, transactions dated on or before the latest closing date SHALL be locked against creation, change and deletion.

#### Scenario: Locked period rejects a change
- **WHEN** a transaction dated on or before the latest closing date is created, changed or deleted
- **THEN** the operation is rejected

#### Scenario: Open period accepts a change
- **WHEN** a transaction dated after the latest closing date is created, changed or deleted
- **THEN** the operation proceeds

### Requirement: Reopening a period removes its closings

Reopening a period SHALL remove every closing dated on or after the last day of the period's first month and SHALL rebuild the ledger of the capital and profit accounts from that date.

#### Scenario: Reopening removes the affected closings
- **WHEN** a period is reopened
- **THEN** the closings from the period's first month onwards are gone and the capital and profit accounts are recalculated

#### Scenario: Reopening an open period changes nothing
- **WHEN** a period with no closings is reopened
- **THEN** nothing is changed

### Requirement: Closing entries appear in the account journal as derived rows

A closing SHALL appear in the capital and profit accounts' journals as a non-editable entry whose description names the closing's month.

#### Scenario: Closing row is visible and read-only
- **WHEN** the account journal of a capital or profit account renders a closing
- **THEN** the closing appears as a non-editable entry describing its month

### Requirement: The monthly closing workflow steps through its states

The closing page SHALL drive a monthly closing through the states Neon, Neon check, Credit card check, Shared check, Shared and Finished, SHALL allow moving on from each check state, and SHALL reject a transition attempted from a state that does not permit it.

#### Scenario: Workflow advances state by state
- **WHEN** the user confirms a check step
- **THEN** the monthly closing moves to the next state

#### Scenario: Invalid transition is rejected
- **WHEN** a check is confirmed from a state that is not a check state
- **THEN** the request is rejected

#### Scenario: Closing page reports an already closed period
- **WHEN** the period already has a closing and the monthly closing is not finished
- **THEN** the page reports that the period is already closed

#### Scenario: Closing page rejects a non-monthly period
- **WHEN** the addressed period is not a single month
- **THEN** the page reports that the period is not a valid monthly period

### Requirement: The monthly workflow imports Neon transactions from a CSV

The monthly closing SHALL accept a CSV export with the required columns Date and Amount, and SHALL create one transaction per confirmed row against the Neon account and the chosen account, plus a remaining-amount transaction for the unassigned rows dated the period's last day.

#### Scenario: Confirmed rows become transactions
- **WHEN** the user confirms rows from the imported Neon export against a chosen account
- **THEN** one transaction per confirmed row is created between the Neon account and the chosen account

#### Scenario: Unassigned rows become a remaining transaction
- **WHEN** some imported rows are not assigned to an account
- **THEN** a transaction for their total is booked between the Neon account and the remaining account, dated the period's last day

#### Scenario: Malformed CSV is rejected
- **WHEN** the imported file is missing the Date or Amount column, or a value does not match the expected format
- **THEN** the import is rejected

#### Scenario: Neon dates must lie inside the period
- **WHEN** an imported Neon date lies outside the addressed month
- **THEN** the initialization is rejected

### Requirement: Shared transactions are categorised before the monthly closing finishes

The monthly closing SHALL let the user assign a category to each shared-account entry of the period before finishing, and SHALL treat amounts categorised as the previous month as a repayment of the shared account's prior balance.

#### Scenario: Categories are stored with the closing
- **WHEN** the user finishes the monthly closing with categories assigned
- **THEN** the shared categories are stored on the monthly closing

#### Scenario: Mismatched previous amount is reported
- **WHEN** the shared account's carried balance plus the previous-month amount is not approximately zero
- **THEN** the finished view reports that the previous amount does not match the repaid amount

### Requirement: Finishing the monthly workflow does not itself write a closing

Marking the monthly closing finished SHALL store the shared categories and the finished state, and SHALL NOT by itself write a closing of the period.

#### Scenario: Finished monthly closing writes no closing
- **WHEN** the monthly closing reaches the finished state
- **THEN** no closing is written by that step
