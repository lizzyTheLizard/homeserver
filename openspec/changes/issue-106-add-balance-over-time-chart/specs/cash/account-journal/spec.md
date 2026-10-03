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

### Requirement: Chart presentation matches the account's balance

The chart SHALL present the account's balance in the same way as the transaction table's Total column. For summation accounts (Cash, Asset, Equity, Liability) the chart is a line chart of the absolute running balance, starting at the opening balance carried into the period (matching the table's opening-balance row). For expense, income and profit accounts the chart is a bar chart: each bar shows only that group's net balance change (the difference for its day, month or year), never the accumulated sum, matching the table's period-relative totals. Credit accounts invert the sign, like the table.

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