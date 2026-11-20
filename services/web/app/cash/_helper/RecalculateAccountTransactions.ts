import { type AccountTransaction, type AccountTransactionInput, createAccountTransaction, deleteAccountTransactions, findLatestAccountTransactionBefore } from '../_data/AccountTransaction';
import { type Closing, findAllClosingsByAccount } from '../_data/Closing';
import { type Period, toString } from './Period';
import { type Transaction, findAllTransactionsByAccount } from '../_data/Transaction';
import type { Queryable } from '@/app/shared/_external/db/access'
import { Temporal } from '@js-temporal/polyfill'
import { logger } from '@/app/shared/logger'
import { v4 as randomUUID } from 'uuid'

export async function recalculateTransactions(client: Queryable, owner: string, projectId: string, from: Temporal.PlainDate, accountIds: string[]): Promise<void> {
  const uniqueAccountIds = Array.from(new Set(accountIds)),
   period: Period = { day: from.day, month: from.month, openEnded: true, year: from.year }
  for (const accountId of uniqueAccountIds) {
    await recalculateTransactionsForAccount(client, owner, projectId, accountId, period)
  }
}

async function recalculateTransactionsForAccount(client: Queryable, owner: string, projectId: string, accountId: string, period: Period): Promise<void> {
  logger.debug(`Recalculating transactions for account ${accountId} for ${toString(period)}`)
  await deleteAccountTransactions(client, owner, accountId, period)
  const transactions = await findAllTransactionsByAccount(client, owner, projectId, accountId, period),
   closings = await findAllClosingsByAccount(client, owner, accountId, period),
   items = [...transactions, ...closings].sort((a, b) => Temporal.PlainDate.compare(a.date, b.date))
  let previous = await findLatestAccountTransactionBefore(client, owner, accountId, period)
  for (const item of items) {
    const c = { accountId, client, item, owner, period, previous }
    previous = await recalculateSingleTransaction(c)
  }
}

async function recalculateSingleTransaction(c: Context): Promise<AccountTransaction> {
  const details = 'credit_account_id' in c.item
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    ? getTransactionDetails(c as Context<Transaction>)
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    : getClosingDetails(c as Context<Closing>),

   accountTransaction: AccountTransactionInput = {
    account_id: c.accountId,
    date: c.item.date,
    id: randomUUID(),
    ordering: (c.previous?.ordering ?? 0) + 1,
    project_id: c.item.project_id,
    ...details,
  }
  return await createAccountTransaction(c.client, c.owner, accountTransaction)
}

function getTransactionDetails(c: Context<Transaction>) {
  const sameAccountTransaction = c.item.credit_account_id === c.item.debit_account_id,
   isCredit = c.item.credit_account_id === c.accountId,
   other_account_id = isCredit ? c.item.debit_account_id : c.item.credit_account_id,
   amount = sameAccountTransaction ? 0 : (isCredit ? -c.item.amount : c.item.amount),
   total_balance = c.previous ? c.previous.total_balance + amount : amount

  return {
    amount,
    description: c.item.description,
    other_account_id,
    total_balance,
    transaction_id: c.item.id,
  }
}

function getClosingDetails(c: Context<Closing>) {
  const sameAccountTransaction = c.item.capital_account_id === c.item.profit_account_id,
   isCredit = c.item.capital_account_id === c.accountId,
   other_account_id = isCredit ? c.item.profit_account_id : c.item.capital_account_id,
   amount = sameAccountTransaction ? 0 : (isCredit ? -c.item.profit : c.item.profit),
   total_balance = c.previous ? c.previous.total_balance + amount : amount,
   description = `Closing ${  Temporal.PlainDate.from(c.item.date).toPlainYearMonth().toString()}`
  return {
    amount,
    description,
    other_account_id,
    total_balance,
  }
}

interface Context<T = Transaction | Closing> {
  client: Queryable
  owner: string
  accountId: string
  period: Period
  item: T
  previous: AccountTransaction | undefined
}
