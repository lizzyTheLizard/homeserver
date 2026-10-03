# Spec Delta

## Purpose

Defines the balance-over-time line chart on the account journal page, so users can see how an account's running balance evolved over the selected period at a glance, without reading every transaction row.

## ADDED Requirements

### Requirement: Balance chart above the transaction table

When an account is selected on the account journal page, the page SHALL display a line chart of the account's balance over the selected period directly above the transaction table.

#### Scenario: Chart shown when an account is selected

- **WHEN** a user opens the journal for a single account that has transactions in the selected period
- **THEN** a line chart appears above the transaction table

#### Scenario: No chart on the general journal

- **WHEN** a user opens the general journal without selecting a single account
- **THEN** no balance chart is displayed

### Requirement: Chart plots running balance against transaction date

The chart SHALL plot each transaction's running balance (`total_balance`) on the y-axis against the transaction's `date` on the x-axis, covering every transaction in the selected period.

#### Scenario: Each transaction becomes a data point

- **WHEN** the chart renders the transactions of the selected period
- **THEN** every transaction contributes a point at (date, total_balance) in period order

### Requirement: Opening balance is the first data point

The chart SHALL start with the account's opening balance as its first data point, reusing the existing opening-balance logic from `AccountJournal.tsx` so chart and table agree: when the transaction table shows an opening balance row, that balance is the first point of the chart.

#### Scenario: Chart starts at the opening balance

- **WHEN** the account journal page shows an opening balance row in the transaction table
- **THEN** the chart's first data point is that opening balance, before the first transaction of the period

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