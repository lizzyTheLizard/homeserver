import { Account } from '../_data/Account'
import { AccountTransaction } from '../_data/AccountTransaction'
import { isCreditAccount, isSummationAccount } from '../_data/AccountType'

export function getTotalForAccounts(accounts: Account[], beforeTransactions: AccountTransaction[], currentTransactions: AccountTransaction[]): number {
  return accounts.map(a => getTotalForAccount(a, beforeTransactions, currentTransactions)).reduce((sum, value) => sum + value, 0)
}

export function getTotalForAccount(a: Account, beforeTransactions: AccountTransaction[], currentTransactions: AccountTransaction[]): number {
  const before = beforeTransactions.find(t => t.account_id === a.id)?.total_balance ?? 0
  const current = currentTransactions.find(t => t.account_id === a.id)?.total_balance ?? before
  const unsignedTotal = isSummationAccount(a.type) ? current : current - before
  let total = isCreditAccount(a.type) ? -unsignedTotal : unsignedTotal
  if (Math.abs(total) < 0.005) total = 0
  return total
}
