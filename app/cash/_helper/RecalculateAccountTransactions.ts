import { logger } from '@/app/shared/logger'
import { findAllTransactionsByAccount, Transaction } from '../_data/Transaction'
import { PoolClient } from 'pg'
import { Period } from './Period'
import { AccountTransaction, AccountTransactionInput, createAccountTransaction, deleteAccountTransactions, findLatestAccountTransactionBefore } from '../_data/AccountTransaction'
import { v4 as randomUUID } from 'uuid'

export async function recalculateTransactions(client: PoolClient, owner: string, projectId: string, from: Date, accountIds: string[]): Promise<void> {
  const uniqueAccountIds = Array.from(new Set(accountIds))
  const period: Period = { year: from.getFullYear(), month: from.getMonth() + 1, day: from.getDate(), openEnded: true }
  for (const accountId of uniqueAccountIds) {
    logger.debug(`Recalculating transactions for account ${accountId} from ${from.toString()}`)
    await recalculateTransactionsForAccount(client, owner, projectId, accountId, period)
  }
}

async function recalculateTransactionsForAccount(client: PoolClient, owner: string, projectId: string, accountId: string, period: Period): Promise<void> {
  await deleteAccountTransactions(client, owner, projectId, accountId, period)
  const transactions = await findAllTransactionsByAccount(client, owner, projectId, accountId, period)
  const stortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
  let previousAccountTransaction = await findLatestAccountTransactionBefore(client, owner, projectId, accountId, period)
  // TODO: Add closings as well
  for (const transaction of stortedTransactions) {
    previousAccountTransaction = await recalculateSingleTransaction(client, owner, projectId, accountId, transaction, previousAccountTransaction)
  }
}

async function recalculateSingleTransaction(client: PoolClient, owner: string, projectId: string, accountId: string, transaction: Transaction, previousAccountTransaction: AccountTransaction | undefined): Promise<AccountTransaction> {
  const sameAccountTransaction = transaction.credit_account_id === transaction.debit_account_id
  const isCredit = transaction.credit_account_id === accountId
  const other_account_id = isCredit ? transaction.debit_account_id : transaction.credit_account_id
  const amount = sameAccountTransaction ? 0 : (isCredit ? -transaction.amount : transaction.amount)
  const total_balance = previousAccountTransaction ? previousAccountTransaction.total_balance + amount : amount

  const accountTransaction: AccountTransactionInput = {
    id: randomUUID(),
    account_id: accountId,
    transaction_id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    ordering: previousAccountTransaction ? previousAccountTransaction.ordering + 1 : 1,
    other_account_id,
    amount,
    total_balance,
  }
  return await createAccountTransaction(client, owner, projectId, accountTransaction)
}
