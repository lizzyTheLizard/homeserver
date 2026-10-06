# Spec Delta

## REMOVED Requirements

### Requirement: Balance chart above the transaction table

**Reason**: The `cash/account-journal` capability is retired; its balance-chart behavior belongs to the journal display owned by the new `cash/transactions` capability.

**Migration**: See the `cash/transactions` capability spec.

### Requirement: Chart presentation matches the account's balance

**Reason**: The `cash/account-journal` capability is retired; the chart's presentation rules move to `cash/transactions`.

**Migration**: See the "Chart presentation matches the transaction table's totals" requirement in the `cash/transactions` capability spec.

### Requirement: Chart plots one point per period group

**Reason**: The `cash/account-journal` capability is retired; the chart's grouping rules move to `cash/transactions`.

**Migration**: See the `cash/transactions` capability spec.

### Requirement: Responsive chart layout

**Reason**: The `cash/account-journal` capability is retired; the chart's layout rules move to `cash/transactions`.

**Migration**: See the `cash/transactions` capability spec.

### Requirement: Chart hidden when no transactions

**Reason**: The `cash/account-journal` capability is retired; the chart's empty state moves to `cash/transactions`.

**Migration**: See the `cash/transactions` capability spec.
