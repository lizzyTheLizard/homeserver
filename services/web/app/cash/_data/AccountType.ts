export type AccountType = 'Cash' | 'Asset' | 'Equity' | 'Liability' | 'Income' | 'Expense' | 'Profit'
export const ACCOUNT_TYPES: AccountType[] = ['Cash', 'Asset', 'Equity', 'Liability', 'Income', 'Expense', 'Profit']

export function toAccountType(value: string): AccountType {
  const accountType = ACCOUNT_TYPES.find(t => t === value)
  if (!accountType) throw new Error(`Invalid account type: ${value}`)
  return accountType
}

// oxlint-disable-next-line typescript/consistent-return
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

// oxlint-disable-next-line typescript/consistent-return
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
