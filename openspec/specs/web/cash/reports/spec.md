# web/cash/reports Specification

## Purpose

Defines the cash reports page: the balance summaries it presents per account type, the values it shows, and the period closing or reopening it offers.

## Requirements

### Requirement: Reports summarize the project's balances by account type

The reports page SHALL present the project's accounts grouped into the five summaries Incomes, Expenses, Profits, Actives (Cash and Asset) and Passives (Equity and Liability), each listing its member accounts and a total for the group.

#### Scenario: Accounts appear in their summary
- **WHEN** the reports page opens for a project
- **THEN** each account is listed under the summary of its type and each summary shows a total

#### Scenario: Report account opens its account journal
- **WHEN** the user selects an account in a report
- **THEN** the account journal of that account opens for the selected period

### Requirement: Report values follow the account's classification

A report SHALL show a summation account's balance and an Expense, Income or Profit account's change within the selected period, SHALL sign-invert credit accounts, and SHALL present a value whose magnitude is negligible as zero.

#### Scenario: Summation account shows its balance
- **WHEN** a summation account is listed in a report
- **THEN** its carried and current balance is shown

#### Scenario: Expense, income and profit show the period change
- **WHEN** an Expense, Income or Profit account is listed in a report
- **THEN** only its change within the selected period is shown

#### Scenario: Negligible values show as zero
- **WHEN** an account's report value is negligibly small
- **THEN** the report shows zero

### Requirement: Archived accounts without a value are hidden

A report SHALL hide an account that is archived and has no value, and SHALL show every other account.

#### Scenario: Empty archived account is hidden
- **WHEN** an archived account has a zero report value
- **THEN** it is not listed in the report

#### Scenario: Archived account with a value is shown
- **WHEN** an archived account has a non-zero report value
- **THEN** it is listed in the report

### Requirement: Reports expose the period's close or reopen action

The reports page SHALL offer to reopen the period when the project's latest closing reaches the end of the selected period, and SHALL otherwise offer to close the period.

#### Scenario: Closed period offers reopening
- **WHEN** the latest closing date is on or after the period's last day
- **THEN** the reports page offers to reopen the period

#### Scenario: Open period offers closing
- **WHEN** the latest closing date is before the period's last day
- **THEN** the reports page offers to close the period
