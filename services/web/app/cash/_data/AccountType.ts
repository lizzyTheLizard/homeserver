export type AccountType = 'Cash' | 'Asset' | 'Equity' | 'Liability' | 'Income' | 'Expense' | 'Profit'
export const ACCOUNT_TYPES: AccountType[] = ['Cash', 'Asset', 'Equity', 'Liability', 'Income', 'Expense', 'Profit']

export function isCreditAccount(account: AccountType): boolean {
  switch (account) {
    case 'Cash':
    case 'Asset':
    case 'Expense':
    case 'Profit':
      return false
    case 'Equity':
    case 'Liability':
    case 'Income':
      return true
  }
}

export function isSummationAccount(type: AccountType): boolean {
  switch (type) {
    case 'Cash':
    case 'Asset':
    case 'Equity':
    case 'Liability':
      return true
    case 'Expense':
    case 'Profit':
    case 'Income':
      return false
  }
}
