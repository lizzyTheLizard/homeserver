# Proposal

## Why

Issue [#106](https://github.com/lizzyTheLizard/homeserver/issues/106): when a user opens a single account's journal, they currently have to read every transaction row to understand how the account balance evolved over the selected period. A line chart of the running balance directly above the transaction table gives that understanding at a glance.

## What Changes

- A line chart is displayed above the transaction table on the account journal page (`web/app/cash/[project_id]/[period]/journal/`) when an account is selected. The chart plots each transaction's running balance (`total_balance`, y-axis) against its `date` (x-axis), with the opening balance as the first data point.
- The chart renders as a Client Component (`"use client"`) using `recharts` (new dependency of `@homeserver/web`).
- Chart data comes from the existing `findAllAccountTransactionsInPeriod()` result (`AccountTransaction` carries `total_balance` and `date` — no new DB queries) plus the existing opening-balance logic already used in `AccountJournal.tsx`.
- The chart is hidden when the selected period has no transactions to display.
- **Note on design**: decided with the issue owner — the chart's visual design (style, colors, axis labeling) is iterated directly on the component during implementation review, not as a separate approved `design/` mockup; the chart is a static, non-interactive visualisation (no tooltip or hover/focus effects).
- **Out of scope** (per the issue): charts on the general journal (all accounts combined), cross-period or multi-period trend views, and other chart types (bar, pie, etc.).

## Capabilities

### New Capabilities
- `cash/account-journal`: The account journal page (`/cash/<project>/<period>/journal?accountId=…`), covering the running-balance line chart above the transaction table — its data, opening-balance first point, placeholder/empty behavior, and responsive layout.

### Modified Capabilities
<!-- None: no existing capability's requirements change. -->

## Impact

- **Web dependency**: `web/package.json` gains `recharts`.
- **Web components**: `web/app/cash/[project_id]/[period]/journal/_components/AccountJournal.tsx` renders the new chart above the `DataTable`; a new `_components/BalanceChart.tsx` (+ CSS module) holds the chart itself. Storybook story and tests for the new component.
- **No impact**: no DB schema changes, no new server actions, no changes to the general journal (`Journal.tsx`), no changes to the assistant or other packages.