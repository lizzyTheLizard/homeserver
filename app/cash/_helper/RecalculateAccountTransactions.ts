import { logger } from '@/app/shared/logger'
import { findAllTransactionsByAccount, Transaction } from '../_data/Transaction'
import { PoolClient } from 'pg'
import { Period, periodToString } from './Period'
import { AccountTransaction, AccountTransactionInput, createAccountTransaction, deleteAccountTransactions, findLatestAccountTransactionBefore } from '../_data/AccountTransaction'
import { v4 as randomUUID } from 'uuid'
import { Closing, findAllClosingsByAccount } from '../_data/Closing'

export async function recalculateTransactions(client: PoolClient, owner: string, projectId: string, from: Date, accountIds: string[]): Promise<void> {
  const uniqueAccountIds = Array.from(new Set(accountIds))
  const period: Period = { year: from.getFullYear(), month: from.getMonth() + 1, day: from.getDate(), openEnded: true }
  for (const accountId of uniqueAccountIds) {
    await recalculateTransactionsForAccount(client, owner, projectId, accountId, period)
  }
}

async function recalculateTransactionsForAccount(client: PoolClient, owner: string, projectId: string, accountId: string, period: Period): Promise<void> {
  logger.debug(`Recalculating transactions for account ${accountId} for ${periodToString(period)}`)
  await deleteAccountTransactions(client, owner, projectId, accountId, period)
  const transactions = await findAllTransactionsByAccount(client, owner, projectId, accountId, period)
  const closings = await findAllClosingsByAccount(client, owner, projectId, accountId, period)
  const items = [...transactions, ...closings].sort((a, b) => a.date.getTime() - b.date.getTime())
  let previous = await findLatestAccountTransactionBefore(client, owner, projectId, accountId, period)
  for (const item of items) {
    const c = { client, owner, projectId, accountId, period, previous, item }
    previous = await recalculateSingleTransaction(c)
  }
}

async function recalculateSingleTransaction(c: Context): Promise<AccountTransaction> {
  const details = 'credit_account_id' in c.item
    ? getTransactionDetails(c as Context<Transaction>)
    : getClosingDetails(c as Context<Closing>)

  const accountTransaction: AccountTransactionInput = {
    id: randomUUID(),
    account_id: c.accountId,
    date: c.item.date,
    ordering: (c.previous?.ordering ?? 0) + 1,
    ...details,
  }
  return await createAccountTransaction(c.client, c.owner, c.projectId, accountTransaction)
}

function getTransactionDetails(c: Context<Transaction>) {
  const sameAccountTransaction = c.item.credit_account_id === c.item.debit_account_id
  const isCredit = c.item.credit_account_id === c.accountId
  const other_account_id = isCredit ? c.item.debit_account_id : c.item.credit_account_id
  const amount = sameAccountTransaction ? 0 : (isCredit ? -c.item.amount : c.item.amount)
  const total_balance = c.previous ? c.previous.total_balance + amount : amount

  return {
    description: c.item.description,
    transaction_id: c.item.id,
    other_account_id,
    amount,
    total_balance,
  }
}

function getClosingDetails(c: Context<Closing>) {
  const sameAccountTransaction = c.item.capital_account_id === c.item.profit_account_id
  const isCredit = c.item.capital_account_id === c.accountId
  const other_account_id = isCredit ? c.item.profit_account_id : c.item.capital_account_id
  const amount = sameAccountTransaction ? 0 : (isCredit ? -c.item.profit : c.item.profit)
  const total_balance = c.previous ? c.previous.total_balance + amount : amount
  return {
    description: 'Closing on ' + c.item.date.toISOString().split('T')[0],
    other_account_id,
    amount,
    total_balance,
  }
}

interface Context<T = Transaction | Closing> {
  client: PoolClient
  owner: string
  projectId: string
  accountId: string
  period: Period
  item: T
  previous: AccountTransaction | undefined
}
