import { endDate, Period, startDate, toString } from '../_helper/Period'
import { logger } from '@/app/shared/logger'
import { Entity, Queryable, removeNull } from '@/app/shared/_external/db/access'

export interface AccountTransactionInput {
  id: string
  ordering: number
  account_id: string
  project_id: string
  other_account_id: string
  amount: number
  total_balance: number
  date: string
  transaction_id?: string
  description?: string
}
export type AccountTransaction = Entity<AccountTransactionInput>

export async function deleteAccountTransactions(client: Queryable, owner: string, accountId: string, period: Period): Promise<void> {
  await client.query(
    'DELETE FROM account_transaction WHERE account_id = $1 AND owner_email = $2 AND date >= $3 AND date < $4',
    [accountId, owner, startDate(period), endDate(period)],
  )
  logger.debug(`Deleting account transactions for account ${accountId} in period ${toString(period)}`)
}

export async function findAllAccountTransactionsInPeriod(client: Queryable, owner: string, accountId: string, period: Period): Promise<AccountTransaction[]> {
  const result = await client.query<AccountTransaction>(
    'SELECT * FROM account_transaction WHERE account_id = $1 AND owner_email = $2 AND date >= $3 AND date < $4 ORDER BY date DESC, ordering DESC',
    [accountId, owner, startDate(period), endDate(period)],
  )
  logger.debug(`Finding ${result.rows.length.toString()} account transactions for account ${accountId} in period ${toString(period)}`)
  return result.rows.map(removeNull)
}

export async function findLatestAccountTransactionBefore(client: Queryable, owner: string, accountId: string, period: Period): Promise<AccountTransaction | undefined> {
  const result = await client.query<AccountTransaction>(
    'SELECT * FROM account_transaction WHERE account_id = $1 AND owner_email = $2 AND date < $3 ORDER BY date DESC, ordering DESC LIMIT 1',
    [accountId, owner, startDate(period)],
  )
  if (result.rows.length === 0) return undefined
  logger.debug(`Finding last account transaction before period ${toString(period)} for account ${accountId}`)
  return removeNull(result.rows[0])
}

export async function findLatestAccountTransactionsBefore(client: Queryable, project_id: string, owner: string, period: Period): Promise<AccountTransaction[]> {
  const result = await client.query<AccountTransaction>(
    `SELECT DISTINCT ON (account_id) *
     FROM account_transaction
     WHERE owner_email = $1 AND date < $2 AND project_id = $3
     ORDER BY account_id, date DESC, ordering DESC`,
    [owner, startDate(period), project_id],
  )
  logger.debug(`Finding latest account transactions before period ${toString(period)}`)
  return result.rows.map(removeNull)
}

export async function findLatestAccountTransactionsIn(client: Queryable, project_id: string, owner: string, period: Period): Promise<AccountTransaction[]> {
  const result = await client.query<AccountTransaction>(
    `SELECT DISTINCT ON (account_id) *
     FROM account_transaction
     WHERE owner_email = $1 AND date >= $2 AND date < $3 AND project_id = $4
     ORDER BY account_id, date DESC, ordering DESC`,
    [owner, startDate(period), endDate(period), project_id],
  )
  logger.debug(`Finding latest account transactions in period ${toString(period)}`)
  return result.rows.map(removeNull)
}

export async function createAccountTransaction(client: Queryable, owner: string, input: AccountTransactionInput): Promise<AccountTransaction> {
  const result = await client.query<AccountTransaction>(
    'INSERT INTO account_transaction (id, ordering, account_id, project_id, other_account_id, amount, total_balance, date, transaction_id, description, owner_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
    [input.id, input.ordering, input.account_id, input.project_id, input.other_account_id, input.amount, input.total_balance, input.date, input.transaction_id, input.description, owner],
  )
  if (!result.rows[0]) throw new Error('Failed to create account transaction')
  logger.debug(`Creating account transaction for account ${input.account_id} on date ${input.date}`)
  return removeNull(result.rows[0])
}
