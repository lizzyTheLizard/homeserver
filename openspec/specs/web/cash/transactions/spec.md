# web/cash/transactions Specification

## Purpose

Defines the cash journal: how transactions are booked, changed and deleted between two accounts, what a closed period forbids, and how the general journal, the account journal and its balance chart present them.

## Requirements

### Requirement: Transactions move an amount between two accounts

Every transaction SHALL belong to one cash project and SHALL record the account credited, the account debited, the amount, the date and a non-blank description.

#### Scenario: Booking a transaction
- **WHEN** the user saves a transaction with two accounts, an amount, a date and a description
- **THEN** the transaction appears in the project's journal for that date

#### Scenario: Blank description is rejected
- **WHEN** a transaction is saved without a description
- **THEN** the save is rejected

### Requirement: Transaction input is validated

Transaction input SHALL be validated as identifiers for the project and both accounts, an amount that is a number, a date in the `YYYY-MM-DD` form that names a real calendar day, and a non-blank description, and creating a transaction SHALL require the project to belong to the signed-in user.

#### Scenario: Malformed input is rejected
- **WHEN** a transaction is saved with a missing or malformed field
- **THEN** the save is rejected

#### Scenario: An impossible date is rejected
- **WHEN** a transaction is saved with a date that is not a real calendar day
- **THEN** the save is rejected instead of failing later in the database

#### Scenario: Booking into a foreign project is rejected
- **WHEN** a user creates a transaction for a project they do not own
- **THEN** the save is rejected

### Requirement: Transactions in a closed period cannot be changed

A transaction SHALL NOT be created, changed or deleted when its date lies on or before the project's latest closing date, and a change SHALL also be refused when the transaction's existing date is closed. The refusal SHALL name the closed period.

#### Scenario: New transaction in a closed period is refused
- **WHEN** a transaction is saved with a date on or before the latest closing date
- **THEN** the save is rejected with an error naming the closed period

#### Scenario: Deleting from a closed period is refused
- **WHEN** a closed transaction is deleted
- **THEN** the deletion is rejected

#### Scenario: Transaction moved out of a closed period is refused
- **WHEN** an existing closed transaction is saved with a different date
- **THEN** the save is rejected

### Requirement: An existing transaction keeps its project

Changing a transaction SHALL NOT move it to another project.

#### Scenario: Changing the project is refused
- **WHEN** a transaction is saved with a project different from the one it was created in
- **THEN** the save is rejected

### Requirement: Saving or deleting a transaction recalculates the affected accounts

Saving or deleting a transaction SHALL rebuild the ledger of every account it credits or debits, and of the accounts it used before a change, from the affected date onwards.

#### Scenario: Saving recalculates both accounts
- **WHEN** a transaction is saved
- **THEN** the credited and debited accounts' running balances from that date are rebuilt

#### Scenario: Deleting recalculates both accounts
- **WHEN** a transaction is deleted
- **THEN** the credited and debited accounts' running balances from that date are rebuilt

### Requirement: The general journal lists the period's transactions

The general journal SHALL list the project's transactions whose date falls inside the selected period, most recent first, showing the credit account, the debit account, the amount, the date and the description.

#### Scenario: Only the period's transactions are listed
- **WHEN** the general journal is opened for a period
- **THEN** transactions inside the period are listed and transactions outside it are not

#### Scenario: Journal is ordered by date descending
- **WHEN** the general journal renders several transactions
- **THEN** they are ordered by date with the most recent first

### Requirement: The account journal shows one account's movements with a running total

The account journal SHALL list the selected account's ledger entries inside the period, most recent first, showing the other account, the amount, the total, the date and the description, and SHALL compute the amount and total according to the account's classification.

#### Scenario: Account journal lists the account's entries
- **WHEN** the user selects a single account on the journal page
- **THEN** the account's ledger entries for the period are listed with their running total

#### Scenario: Total column follows the account's classification
- **WHEN** the account is a summation account
- **THEN** the total column shows the accumulated balance, sign-inverted for a credit account

#### Scenario: Period change account shows the change
- **WHEN** the selected account is an Expense, Income or Profit account
- **THEN** the total column shows the change within the period rather than the accumulated balance

### Requirement: An account journal booking records one side of a transaction

Booking from the account journal SHALL take the selected account and one other account, SHALL debit the selected account for an amount that increases its own balance and credit it for an amount that decreases it, and SHALL store the amount unsigned.

#### Scenario: An amount that increases the balance debits the account
- **WHEN** the user books an amount that increases the selected account's own balance
- **THEN** the selected account is the debit side of the transaction

#### Scenario: An amount that decreases the balance credits the account
- **WHEN** the user books an amount that decreases the selected account's own balance
- **THEN** the selected account is the credit side of the transaction

#### Scenario: Credit accounts invert the entered sign
- **WHEN** the user books a positive amount on a credit account
- **THEN** the credit account is the credit side, because its displayed balance is sign-inverted

### Requirement: Derived ledger rows are not editable

The account journal SHALL show the opening-balance row and the closing rows without offering to edit or delete them. Rows that describe a real transaction, including the monthly closing's remaining-amount transaction, remain editable.

#### Scenario: Closing row is read-only
- **WHEN** the user selects a closing entry in the account journal
- **THEN** no edit or delete action is offered

#### Scenario: A remaining-amount transaction is editable
- **WHEN** the account journal shows the monthly closing's remaining-amount transaction
- **THEN** it can be edited and deleted like any other transaction

### Requirement: The account journal shows a balance chart above the transaction table

When an account is selected on the account journal page and its selected period contains ledger entries, the page SHALL display a chart of the account's balance over that period directly above the transaction table; no chart SHALL be shown on the general journal or for an empty period.

#### Scenario: Chart shown when an account is selected
- **WHEN** a user opens the journal for a single account that has transactions in the selected period
- **THEN** a chart appears above the transaction table

#### Scenario: No chart on the general journal
- **WHEN** a user opens the general journal without selecting a single account
- **THEN** no balance chart is displayed

#### Scenario: Empty period hides the chart
- **WHEN** a user opens the journal for an account whose selected period has no transactions
- **THEN** no chart is shown and the transaction table renders as before

### Requirement: The chart type and values match the transaction table's total

The chart SHALL present the account's balance the same way as the transaction table's Total column. A summation account SHALL be shown as a line of the running balance starting at the opening balance carried into the period; an Expense, Income or Profit account SHALL be shown as a bar chart whose bars show each group's net balance change. Credit accounts SHALL be sign-inverted, like the table.

#### Scenario: Summation account shows a running-balance line
- **WHEN** the account journal page shows an opening balance row in the transaction table
- **THEN** the chart is a line whose first data point is that opening balance, before the first transaction of the period

#### Scenario: Expense or income account shows bars of per-group differences
- **WHEN** the selected account is an Expense, Income or Profit account
- **THEN** the chart is a bar chart with one bar per group, each bar showing only that group's net balance change

### Requirement: The chart plots one point per period group

The chart SHALL show at most one point or bar per group, with the grouping matching the selected period: a single-month period groups by day, a single-year period by month, and the whole history by year.

#### Scenario: Each period group contributes one point
- **WHEN** the chart renders the transactions of the selected period
- **THEN** each day, month or year contributes a single point or bar, in period order

#### Scenario: Several transactions in one group collapse
- **WHEN** multiple transactions of the selected period fall within the same group
- **THEN** the chart shows a single point for that group (the last transaction's running balance) or a single bar (the group's net change)

### Requirement: Responsive chart layout

The chart SHALL fit the page layout at desktop and mobile widths.

#### Scenario: Desktop layout
- **WHEN** the account journal is viewed at desktop width
- **THEN** the chart scales to the page width and remains readable

#### Scenario: Mobile layout
- **WHEN** the account journal is viewed at mobile width
- **THEN** the chart fits within the viewport width without horizontal overflow
