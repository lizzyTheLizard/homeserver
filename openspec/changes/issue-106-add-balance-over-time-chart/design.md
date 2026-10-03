# Design

## Context

See [proposal.md](proposal.md) — Why. The account journal page renders `AccountJournal` (`web/app/cash/[project_id]/[period]/journal/_components/AccountJournal.tsx`) when an account is selected via `?accountId=…`; the general journal (`Journal.tsx`) is out of scope per the issue.

Current state (observed):

- `loadAccountJournal()` in `journal/server.ts` already returns `{ account, accounts, transactions, lastTransaction }` — `transactions` comes from `findAllAccountTransactionsInPeriod()` (each `AccountTransaction` carries `total_balance` and `date`), plus `lastTransaction` from `findLatestAccountTransactionBefore()`. No new queries or server changes are needed.
- `AccountJournal.tsx` already computes the opening-balance row for summation accounts (`isSummationAccount(account.type) && lastTransaction`) via `getOpeningBalanceTransaction(lastTransaction)`, returning `{ id: '0', total_balance: last.total_balance, description: 'Opening Balance' }`. This is the logic to reuse as the chart's first point.
- `AccountJournal` is a Client Component (`'use client'`) rendering a shared `DataTable`; the page shell (`page.tsx`) wraps it in `<main>`.
- The app's design tokens (`--gap`, `--gap-small`, `--border-radius`) are defined in `web/public/global.css`.
- Decided with the issue owner: there is no separate `design/` mockup for the chart — the visual design (style, colors, axis labeling, tooltip) is worked out directly on the component during implementation review.

## Goals / Non-Goals

**Goals:**
- Render a `recharts` line chart above the transaction table on the account journal page when an account is selected.
- Reuse the existing data flow and opening-balance logic — no DB queries, no server action changes.
- Hide the chart when there are no transactions, and keep it responsive at desktop and mobile widths.
- Decide the chart's visual design (colors, axis labels, tooltip) directly on the component during implementation review.

**Non-Goals:**
- No chart on the general journal (`Journal.tsx`), no cross-period/multi-period trends, no other chart types — all explicitly out of scope in the issue.
- No redesign of the journal page layout beyond inserting the chart block above the table.
- No server-side data aggregation or new API surface.

## Decisions

### D1: Chart data is derived client-side from the existing `transactions` prop

The chart consumes the same `transactions: AccountTransaction[]` array already passed to `AccountJournal`. Coordinates come straight from the model's `date` (x-axis) and `total_balance` (y-axis). Because `findAllAccountTransactionsInPeriod()` returns rows ordered `date DESC, ordering DESC`, the chart component sorts ascending by `date` (and `ordering` for ties) for a left-to-right timeline.

- **Rationale**: the issue's technical notes state `findAllAccountTransactionsInPeriod()` covers all needed fields; deriving on the client avoids new queries and keeps the change local to the component layer.
- **Alternative considered**: computing chart points in `server.ts`. Rejected: it would duplicate data the client already has and add server surface for no benefit.

### D2: Opening balance reuses the existing `AccountJournal` logic

The chart's first point is produced by the same `getOpeningBalanceTransaction(lastTransaction)` helper (existing condition: summation account with a `lastTransaction`), so the chart's opening point and the table's "Opening Balance" row always agree. The opening-balance point gets a synthetic x — it is placed before the first period transaction at the period start (e.g. `startDate(period)`), since `getOpeningBalanceTransaction` carries no `date`.

- **Rationale**: the issue explicitly says to reuse the opening-balance logic in `AccountJournal.tsx`; tying the chart point to the same helper prevents drift between table and chart.
- **Alternative considered**: querying the balance at period start separately. Rejected: `lastTransaction.total_balance` is exactly that value and is already loaded; a new query would duplicate it.

### D3: New `BalanceChart` client component using `recharts`

A new `BalanceChart` component (`web/app/cash/[project_id]/[period]/journal/_components/BalanceChart.tsx` + `BalanceChart.module.css`) renders a `recharts` `<LineChart>` inside a `ResponsiveContainer`, with the transaction table's currency/sign presentation preserved (credit accounts show adjusted totals as the table does — the component accepts the already-adjusted display value or applies the same `totalCell`-style adjustment, mirroring `AccountJournal`'s existing presentation). `recharts` is added to `web/package.json`.

- **Rationale**: `recharts` was chosen in the issue's technical notes; its `ResponsiveContainer` gives responsive desktop/mobile behavior with minimal code, and `Tooltip` covers the hover/tooltip behavior.
- **Alternative considered**: hand-rolled SVG. Rejected: more code, worse tooltip/responsive behavior, and the issue already preselects `recharts`.

### D4: Rendering and placement in `AccountJournal.tsx`

`AccountJournal` renders `<BalanceChart … />` directly above the `<DataTable>`, passing `transactions`, `lastTransaction`, `account`, and `period`. The chart renders only when there is at least one transaction to plot (including the opening-balance point); otherwise it renders nothing, satisfying the "hidden when empty" requirement.

- **Rationale**: keeps the chart a child of the existing client component — no page/server changes, and the "account selected" condition is already where `AccountJournal` is rendered.
- **Alternative considered**: rendering the chart in `page.tsx`. Rejected: page.tsx is a server component and the data-preparation logic (opening balance, ordering) already lives in `AccountJournal`.

### D5: Visual design is set during implementation review

The chart's styling (line style and colors, axis labeling, tooltip formatting) is decided when the component is built, reusing the app's existing tokens and the journal page's currency/sign presentation, and is confirmed with the user in the implementation review.

- **Rationale**: the issue owner asked to skip a separate `design/` mockup and iterate on the component directly; per the proposal, this deviates from the issue's acceptance-criterion #1 by decision.
- **Alternative considered**: a `design/cash/` mockup first. Rejected by the issue owner — no `design/` files are to be updated in this change.

## Risks / Trade-offs

- [recharts version / React 19 compatibility] → Mitigation: pin the current stable `recharts` release; it renders inside `ResponsiveContainer` only, so any compatibility issue is isolated to the chart component.
- [Chart/table total mismatch for credit or non-summation accounts] → Mitigation: D2/D3 reuse the same total adjustment and opening-balance helper as `AccountJournal`, so line and table stay consistent.
- [Storybook interaction tests with `recharts`] → Mitigation: add a Storybook story + interaction tests for `BalanceChart` per the repo's storybook test project, verifying tooltip and rendering behavior.
- [Opening-balance point has no date] → Mitigation: D2 assigns the period start date as its x in the component; the chart shows the opening point as the leftmost data point.
- [No pre-approved visual reference for the chart] → Mitigation: D5 iterates the styling on the component and confirms it with the user in the implementation review before the task is committed.

## Migration Plan

No data migration, no environment changes: `recharts` is a new runtime dependency of `@homeserver/web` installed by `pnpm install`; the web app is rebuilt and deployed via the standard repo `Dockerfile` flow. Rollback is a revert of the change's PR.

## Open Questions

- None that affect the specs, approach, or tasks — the remaining unknowns (exact colors, axis formatting, tooltip content) are settled on the component during implementation review (D5).