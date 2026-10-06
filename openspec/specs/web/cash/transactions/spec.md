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

Transaction input SHALL be validated as identifiers for the project and both accounts, a number amount and a valid date, and creating a transaction SHALL require the project to belong to the signed-in user.

#### Scenario: Malformed input is rejected
- **WHEN** a transaction is saved with a missing or malformed field
- **THEN** the save is rejected

#### Scenario: Booking into a foreign project is rejected
- **WHEN** a user creates a transaction for a project they do not own
- **THEN** the save is rejected

### Requirement: Transactions in a closed period cannot be changed

A transaction SHALL NOT be created, changed or deleted when its date lies on or before the project's latest closing date, and a change SHALL also be refused when the transaction's existing date is closed.

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
- **WHEN** the account is a sum of the running balance (a summation account)
- **THEN** the total column shows the accumulated balance, sign-inverted for a credit account

#### Scenario: Period change account shows the change
- **WHEN** the selected account is an Expense, Income or Profit account
- **THEN** the total column shows the change within the period rather than the accumulated balance

### Requirement: An account journal entry records one side of a transaction

Booking from the account journal SHALL take one account and one other account, SHALL debit the selected account for a positive amount and credit it for a negative amount, and SHALL store the amount unsigned.

#### Scenario: Positive amount debits the account
- **WHEN** the user books a positive amount from the account journal
- **THEN** the selected account is the debit side of the transaction

#### Scenario: Negative amount credits the account
- **WHEN** the user books a negative amount from the account journal
- **THEN** the selected account is the credit side of the transaction

### Requirement: Derived ledger rows are not editable

The account journal SHALL show the opening-balance row, the closing rows and the remaining-amount rows without offering to edit or delete them.

#### Scenario: Closing row is read-only
- **WHEN** the user selects a closing entry in the account journal
- **THEN** no edit or delete action is offered

### Requirement: Balance chart above the transaction table

When an account is selected on the account journal page, the page SHALL display a line chart of the account's balance over the selected period directly above the transaction table.

#### Scenario: Chart shown when an account is selected
- **WHEN** a user opens the journal for a single account that has transactions in the selected period
- **THEN** a line chart appears above the transaction table

#### Scenario: No chart on the general journal
- **WHEN** a user opens the general journal without selecting a single account
- **THEN** no balance chart is displayed

### Requirement: Chart presentation matches the transaction table's totals

The chart SHALL present the account's balance the same way as the transaction table's Total column. For summation accounts it is a line of the running balance starting at the opening balance carried into the period; for expense, income and profit accounts it is a bar chart whose bars show only each group's net balance change. Credit accounts are sign-inverted, like the table.

#### Scenario: Summation account shows a running-balance line
- **WHEN** the account journal page shows an opening balance row in the transaction table (a summation account)
- **THEN** the chart is a line whose first data point is that opening balance, before the first transaction of the period

#### Scenario: Expense or income account shows bars of per-group differences
- **WHEN** the selected account is an expense, income or profit account
- **THEN** the chart is a bar chart with one bar per day (month period), month (year period), or year (all history), each bar showing only that group's net balance change

### Requirement: Chart plots one point per period group

The chart SHALL show at most one point (or bar) per group, with the grouping matching the selected period: a single-month period groups by day, a single-year period by month, and the whole history by year. For bars, each group shows its net balance change (the difference between consecutive group-ending balances, or from the carried-in balance for the first group).

#### Scenario: Each period group contributes one point
- **WHEN** the chart renders the transactions of the selected period
- **THEN** each day (month period), month (year period), or year (all history) contributes a single point or bar, in period order

#### Scenario: Several transactions in one group collapse
- **WHEN** multiple transactions of the selected period fall within the same day, month, or year group
- **THEN** the chart shows a single point for that group (the last transaction's running balance) or a single bar (the group's net change)

### Requirement: Responsive chart layout

The chart SHALL fit the page layout at desktop and mobile widths.

#### Scenario: Desktop layout
- **WHEN** the account journal is viewed at desktop width
- **THEN** the chart scales to the page width and remains readable

#### Scenario: Mobile layout
- **WHEN** the account journal is viewed at mobile width
- **THEN** the chart fits within the viewport width without horizontal overflow

### Requirement: Chart hidden when no transactions

The chart SHALL be hidden when the selected period has no transactions to display.

#### Scenario: Empty period hides the chart
- **WHEN** a user opens the journal for an account whose selected period has no transactions
- **THEN** no chart is shown and the transaction table renders as before
