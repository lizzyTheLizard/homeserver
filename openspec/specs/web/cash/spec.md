# web/cash Specification

## Purpose

Defines the cash capability's shared model: project-scoped double-entry bookkeeping in which accounts carry a type, a period selects the range being viewed, and every transaction moves an amount from a credit account to a debit account.

## Requirements

### Requirement: Cash books are scoped to a project and a period

Cash SHALL present a user's books as a project and a period, with the journal, accounts, reports and closing pages addressed by that project and period. Opening cash without an explicit project SHALL continue to the user's only project, or to the project list when there is none or several.

#### Scenario: Opening cash with a single project

- **WHEN** the user owns exactly one cash project and opens the cash application
- **THEN** cash opens that project's journal for the default period

#### Scenario: Opening cash without a single project

- **WHEN** the user owns no project or several projects and opens the cash application
- **THEN** cash shows the user's project list

#### Scenario: A project page is addressed by project and period

- **WHEN** the user opens any of the journal, accounts, reports or closing pages
- **THEN** the page shows that project for the selected period

### Requirement: Account types determine how balances are presented

Every account SHALL have one of the types Cash, Asset, Equity, Liability, Income, Expense or Profit. Equity, Liability and Income SHALL be treated as credit accounts whose displayed balance is sign-inverted. Cash, Asset, Equity and Liability SHALL be treated as summation accounts showing a running balance, while Expense, Income and Profit SHALL show only the change within the selected period.

#### Scenario: Credit account balance is sign-inverted

- **WHEN** an account of a credit type is displayed in a journal, report or chart
- **THEN** its balance is shown with the sign inverted relative to the stored ledger

#### Scenario: Summation account shows a running balance

- **WHEN** an account of a summation type is displayed for a period
- **THEN** it shows the balance carried into and running through the period

#### Scenario: Expense or income account shows the period change

- **WHEN** an account of type Expense, Income or Profit is displayed for a period
- **THEN** it shows only the change within that period, not the accumulated balance

### Requirement: Periods select the range being viewed

Cash SHALL accept a period of all history, the current period, a year, a month or a day, and SHALL treat a period written with a trailing plus as open-ended so that it runs to the end of the books. The current period SHALL be the previous calendar month.

#### Scenario: Open-ended period runs on

- **WHEN** the period is written with a trailing plus
- **THEN** the period has no end and includes everything from its start onwards

#### Scenario: Current period is the previous month

- **WHEN** the period is the current period
- **THEN** it covers the calendar month before the present one

#### Scenario: Invalid period is rejected

- **WHEN** the period segment does not name a supported period
- **THEN** the project is reported as not found

### Requirement: Cash requires owning at least one project

Access to the cash application SHALL be granted only to a user who owns at least one cash project, and every cash query and mutation SHALL be limited to the signed-in user's own data.

#### Scenario: A user without projects has no cash access

- **WHEN** a user who owns no cash project opens a cash page or action
- **THEN** the request is rejected as unauthorized

#### Scenario: A user only sees their own data

- **WHEN** a user views or changes cash data
- **THEN** only records owned by that user are read or written

### Requirement: Cash mutations are recorded in the event log

Creating, changing or deleting cash records SHALL append an informational entry to the application's event log naming the affected record.

#### Scenario: A transaction mutation is logged

- **WHEN** a transaction is created, changed or deleted
- **THEN** an informational event naming the transaction is recorded
