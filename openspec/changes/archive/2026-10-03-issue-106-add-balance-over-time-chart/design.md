# Design

## Context

See [proposal.md](proposal.md) — Why. The account journal page renders `AccountJournal` (`web/app/cash/[project_id]/[period]/journal/_components/AccountJournal.tsx`) when an account is selected via `?accountId=…`; the general journal (`Journal.tsx`) is out of scope per the issue.

Current state (observed):

- `loadAccountJournal()` in `journal/server.ts` already returns `{ account, accounts, transactions, lastTransaction }` — `transactions` comes from `findAllAccountTransactionsInPeriod()` (each `AccountTransaction` carries `total_balance` and `date`), plus `lastTransaction` from `findLatestAccountTransactionBefore()`. No new queries or server changes are needed.
- `AccountJournal.tsx` already computes the opening-balance row for summation accounts (`isSummationAccount(account.type) && lastTransaction`) via `getOpeningBalanceTransaction(lastTransaction)`, returning `{ id: '0', total_balance: last.total_balance, description: 'Opening Balance' }`. This is the logic to reuse as the chart's first point.
- `AccountJournal` is a Client Component (`'use client'`) rendering a shared `DataTable`; the page shell (`page.tsx`) wraps it in `<main>`.
- The app's design tokens (`--gap`, `--gap-small`, `--border-radius`) are defined in `web/public/global.css`.
- Decided with the issue owner: there is no separate `design/` mockup for the chart — the visual design (style, colors, axis labeling) is worked out directly on the component during implementation review.

## Goals / Non-Goals

**Goals:**
- Render a `recharts` line chart above the transaction table on the account journal page when an account is selected.
- Reuse the existing data flow and opening-balance logic — no DB queries, no server action changes.
- Hide the chart when there are no transactions, and keep it responsive at desktop and mobile widths.
- Decide the chart's visual design (colors, axis labels) directly on the component during implementation review.

**Non-Goals:**
- No chart on the general journal (`Journal.tsx`), no cross-period/multi-period trends, no other chart types — all explicitly out of scope in the issue.
- No redesign of the journal page layout beyond inserting the chart block above the table.
- No server-side data aggregation or new API surface.

## Decisions

### D1: Chart data is derived client-side from the existing `transactions` prop

The chart consumes the same `transactions: AccountTransaction[]` array already passed to `AccountJournal`. Coordinates come straight from the model's `date` (x-axis) and `total_balance` (y-axis). Because `findAllAccountTransactionsInPeriod()` returns rows ordered `date DESC, ordering DESC`, the chart component sorts ascending by `date` (and `ordering` for ties) for a left-to-right timeline. The x-axis is a **true time axis**: each point carries its epoch-millisecond timestamp (`toTimestamp`) and recharts' numeric `time` scale positions points proportionally to the real days between them (not evenly spaced as a category axis would). To keep the line readable, the chart plots **one point per period group**, with the group matching the selected period: a single-month period groups by day, a single-year period by month, and the whole history by year. Within each group only the last transaction (highest `ordering` / latest date) becomes a point, showing the group's ending balance.

- **Rationale**: the issue's technical notes state `findAllAccountTransactionsInPeriod()` covers all needed fields; deriving on the client avoids new queries and keeps the change local to the component layer. The period-dependent granularity and the proportional time axis were requested by the issue owner during implementation review (initially only same-day dedup, then extended to month/year groups for year/all periods).
- **Alternative considered**: computing chart points in `server.ts`. Rejected: it would duplicate data the client already has and add server surface for no benefit. Plotting every transaction (no dedup) was the initial behavior; it was replaced per the owner's request.

### D2: Values mirror the table per account type (line vs. bars)

The chart's values mirror the transaction table's Total column per account type, implemented in the pure helpers in `BalanceChartHelpers.ts`. For summation accounts (`prepareBalancePoints`) the chart is a line of the absolute running balance starting at the opening balance, computed from the same `lastTransaction` the table's opening-balance row uses (`getOpeningBalanceTransaction(lastTransaction).total_balance`), so chart and table agree. For expense, income and profit accounts (`prepareBalanceDeltas`) the chart is a bar chart where each bar shows only that group's net balance change — the difference between consecutive group-ending balances, or from the carried-in balance for the first group — never the accumulated running balance. Credit accounts invert the sign, exactly like `totalCell` in `AccountJournal.tsx`. The line's opening point gets a synthetic x at `startDate(period)` since it carries no `date` of its own.

- **Rationale**: the issue explicitly says to reuse the opening-balance logic in `AccountJournal.tsx`; tying the summation point to the same value prevents drift between table and chart, and giving non-summation accounts per-group difference bars keeps the whole chart consistent with the table (requested by the issue owner during implementation review).
- **Alternative considered**: plotting the accumulated running balance for non-summation accounts. Rejected per the owner's request — bars must show only the difference, not the accumulated sum.

### D3: New `BalanceChart` client component using `recharts`

A new `BalanceChart` component (`web/app/cash/[project_id]/[period]/journal/_components/BalanceChart.tsx` + `BalanceChart.module.css`) renders inside a `ResponsiveContainer`, choosing a `recharts` `<LineChart>` for summation accounts and a `<BarChart>` for expense/income/profit accounts via `chartKindForAccount()`. It receives the raw `transactions`, `lastBalance` (the carried-in balance), `accountType` and `period`, and delegates all data shaping to the pure `prepareBalancePoints()` / `prepareBalanceDeltas()` helpers so the chart's values match the transaction table's Total column. The line chart uses a time-proportional numeric x-axis; the bar chart uses a category x-axis with a fixed `barSize`. The y-axis is pinned to "nice" ticks computed by `niceTicks()` over the 0-inclusive data range, so the grid always contains a line exactly at 0 — the bold zero `ReferenceLine` therefore always sits on a grid line, never floating between them (recharts' default ticks otherwise miss 0, especially for all-negative data). `recharts` is added to `web/package.json`.

- **Rationale**: `recharts` was chosen in the issue's technical notes; its `ResponsiveContainer` gives responsive desktop/mobile behavior with minimal code.
- **Alternative considered**: hand-rolled SVG. Rejected: more code, worse responsive behavior, and the issue already preselects `recharts`.

### D4: Rendering and placement in `AccountJournal.tsx`

`AccountJournal` renders `<BalanceChart … />` directly above the `<DataTable>`, passing `transactions`, `lastTransaction`, `account`, and `period`. The chart renders only when there is at least one transaction to plot (including the opening-balance point); otherwise it renders nothing, satisfying the "hidden when empty" requirement.

- **Rationale**: keeps the chart a child of the existing client component — no page/server changes, and the "account selected" condition is already where `AccountJournal` is rendered.
- **Alternative considered**: rendering the chart in `page.tsx`. Rejected: page.tsx is a server component and the data-preparation logic (opening balance, ordering) already lives in `AccountJournal`.

### D5: Visual design is set during implementation review

The chart's styling (line style and colors, axis labeling) is decided when the component is built, reusing the app's existing tokens and the journal page's currency/sign presentation, and is confirmed with the user in the implementation review. The chart is a static, non-interactive visualisation: no hover tooltip, no hover/focus effects, and no focusable element (`accessibilityLayer={false}`, no `tabIndex`/`role`; the CSS disables pointer events, focus outlines and text selection). When the data contains negative entries, the 0 line is rendered as a bold reference line (2px, dark) aligned to a grid line via the y-axis's nice ticks, so it stays the main line on the y-axis — requested by the issue owner during implementation review.

- **Rationale**: the issue owner asked to skip a separate `design/` mockup and iterate on the component directly; per the proposal, this deviates from the issue's acceptance-criterion #1 by decision.
- **Alternative considered**: a `design/cash/` mockup first. Rejected by the issue owner — no `design/` files are to be updated in this change.

## Risks / Trade-offs

- [recharts version / React 19 compatibility] → Mitigation: pin the current stable `recharts` release; it renders inside `ResponsiveContainer` only, so any compatibility issue is isolated to the chart component.
- [Chart/table total mismatch for credit or non-summation accounts] → Mitigation: D2/D3 reuse the same total adjustment and opening-balance helper as `AccountJournal`, so line and table stay consistent.
- [Storybook interaction tests with `recharts`] → Mitigation: add a Storybook story + interaction tests for `BalanceChart` per the repo's storybook test project, verifying rendering behavior.
- [Opening-balance point has no date] → Mitigation: D2 assigns the period start date as its x in the component; the chart shows the opening point as the leftmost data point.
- [No pre-approved visual reference for the chart] → Mitigation: D5 iterates the styling on the component and confirms it with the user in the implementation review before the task is committed.

## Migration Plan

No data migration, no environment changes: `recharts` is a new runtime dependency of `@homeserver/web` installed by `pnpm install`; the web app is rebuilt and deployed via the standard repo `Dockerfile` flow. Rollback is a revert of the change's PR.

## Open Questions

- None that affect the specs, approach, or tasks — the remaining unknowns (exact colors, axis formatting) are settled on the component during implementation review (D5).