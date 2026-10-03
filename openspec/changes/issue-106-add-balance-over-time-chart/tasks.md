# Tasks

## 1. Chart Implementation

- [x] 1.1 Add `recharts` to `@homeserver/web` dependencies (`web/package.json`) and install it. Verify: `pnpm install` succeeds and `pnpm --filter @homeserver/web build` still passes
- [x] 1.2 Create the `BalanceChart` Client Component (`web/app/cash/[project_id]/[period]/journal/_components/BalanceChart.tsx` + `BalanceChart.module.css`) using `recharts`: plots `total_balance` (y-axis) against `date` (x-axis) for every transaction in ascending period order, includes the opening balance as the first point (x = period start), is hidden when there are no transactions, scales via `ResponsiveContainer`, and is a static non-interactive visualisation (no tooltip, hover/focus effects or focusable element). Verify: a Storybook story with interaction tests covers rendering, the opening-balance first point, responsive container, the empty state, and the absence of any interactivity (no tooltip, no `tabindex`/`role`)
- [ ] 1.3 Render `<BalanceChart>` in `AccountJournal.tsx` above the `DataTable`, passing the existing `transactions`, `lastTransaction`, `account`, and `period` props and reusing the existing opening-balance logic (`getOpeningBalanceTransaction` / summation-account condition). Verify: `journal/server.tests.ts` still passes, the chart appears above the table at `/cash/<project>/<period>/journal?accountId=…` with an opening-balance first point, and is absent on the general journal and when the period has no transactions

## 2. Integration Verification

- [ ] 2.1 Run the full web validation and whole-repo checks: `pnpm --filter @homeserver/web test` (unit, integration, storybook) and `pnpm lint:ci` from the repo root, plus a manual browser check of the account journal at desktop and mobile widths (chart visible, responsive, hidden when empty). Verify: all test projects and lint pass with no failures