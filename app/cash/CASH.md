# Cash domain notes

A double-entry bookkeeping app for personal finances. Each user owns one or more **projects**; a project owns **accounts** and **transactions**.

## Account types

`'Cash' | 'Asset' | 'Equity' | 'Liability' | 'Income' | 'Expense' | 'Profit'`

| Type      | Credit account | Summation account |
|-----------|----------------|-------------------|
| Cash      | no             | yes               |
| Asset     | no             | yes               |
| Equity    | yes            | yes               |
| Liability | yes            | yes               |
| Income    | yes            | no                |
| Expense   | no             | no                |
| Profit    | no             | no                |

A *credit account* increases on the credit side of a transaction; a *summation account* carries its balance forward across periods (the others are reset by closings).

## Period grammar

URLs use `[period]` segments parsed by [app/cash/_helper/Period.ts](app/cash/_helper/Period.ts):

- `ALL` — all-time
- `CURRENT` — the current calendar month (resolved server-side)
- `2026` — full year
- `2026-04` — single month
- `2026-04-15` — single day
- Any of the above suffixed with `+` is open-ended (start to forever)

## Monthly closing workflow

State machine in [app/cash/_data/MonthlyState.ts](app/cash/_data/MonthlyState.ts):

```
NEON → NEONCHECK → CREDITCARDCHECK → SHAREDCHECK → SHARED → FINISHED
```

1. **NEON**: User uploads the Neon bank CSV. Each row gets categorised to an account.
2. **NEONCHECK**: Generated transactions are presented for review.
3. **CREDITCARDCHECK**: Same review for the credit-card account.
4. **SHAREDCHECK**: Review the shared account.
5. **SHARED**: User assigns categories to shared transactions.
6. **FINISHED**: Period closed; an immutable `closing` row is written with profit + capital + profit accounts.

Reopening a period deletes all closings on or after the requested first month and recomputes the affected account balances.

## Recalculation

[app/cash/_helper/RecalculateAccountTransactions.ts](app/cash/_helper/RecalculateAccountTransactions.ts) regenerates the `account_transaction` rows for one or more accounts from a given date forward. It is called whenever a `transaction` or `closing` is created, modified, or deleted.
