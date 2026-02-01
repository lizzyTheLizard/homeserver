import { PoolClient } from 'pg'
import { endDate, Period, periodToString, startDate } from '../_helper/Period'
import { logger } from '@/app/shared/logger'

export interface AccountTransaction {
  id: string
  project_id: string
  owner_id: string
  ordering: number
  account_id: string
  other_account_id: string
  amount: number
  total_balance: number
  date: Date
  transaction_id?: string
  description?: string
  created_at: Date
  updated_at: Date
}

export interface AccountTransactionInput {
  id: string
  ordering: number
  account_id: string
  other_account_id: string
  amount: number
  total_balance: number
  date: Date
  transaction_id?: string
  description?: string
}

export async function deleteAccountTransactions(client: PoolClient, owner: string, projectId: string, accountId: string, period: Period): Promise<void> {
  await client.query(
    'DELETE FROM account_transaction WHERE account_id = $1 AND owner_id = $2 AND project_id = $3 AND date >= $4 AND date < $5',
    [accountId, owner, projectId, startDate(period), endDate(period)],
  )
  logger.debug(`Deleting account transactions for account ${accountId} in period ${periodToString(period)}`)
}

export async function findAllAccountTransactionsInPeriod(client: PoolClient, owner: string, projectId: string, accountId: string, period: Period): Promise<AccountTransaction[]> {
  const result = await client.query<AccountTransaction>(
    'SELECT * FROM account_transaction WHERE account_id = $1 AND owner_id = $2 AND project_id = $3 AND date >= $4 AND date < $5 ORDER BY date DESC, ordering DESC',
    [accountId, owner, projectId, startDate(period), endDate(period)],
  )
  logger.debug(`Finding ${result.rows.length.toString()} account transactions for account ${accountId} in period ${periodToString(period)}`)
  return result.rows.map(row => mapAccountTransactionRow(row))
}

export async function findLatestAccountTransactionBefore(client: PoolClient, owner: string, projectId: string, accountId: string, period: Period): Promise<AccountTransaction | undefined> {
  const result = await client.query<AccountTransaction>(
    'SELECT * FROM account_transaction WHERE account_id = $1 AND owner_id = $2 AND project_id = $3 AND date < $4 ORDER BY date DESC, ordering DESC LIMIT 1',
    [accountId, owner, projectId, startDate(period)],
  )
  if (result.rows.length === 0) return undefined
  logger.debug(`Finding last account transaction before period ${periodToString(period)} for account ${accountId}`)
  return mapAccountTransactionRow(result.rows[0])
}

export async function createAccountTransaction(client: PoolClient, owner: string, projectId: string, input: AccountTransactionInput): Promise<AccountTransaction> {
  const result = await client.query<AccountTransaction>(
    'INSERT INTO account_transaction (id, project_id, ordering, account_id, other_account_id, amount, total_balance, date, transaction_id, description, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
    [input.id, projectId, input.ordering, input.account_id, input.other_account_id, input.amount, input.total_balance, input.date, input.transaction_id, input.description, owner],
  )
  if (!result.rows[0]) throw new Error('Failed to create account transaction')
  logger.debug(`Creating account transaction for account ${input.account_id} on date ${input.date.toISOString()}`)
  return mapAccountTransactionRow(result.rows[0])
}

function mapAccountTransactionRow(row: AccountTransaction): AccountTransaction {
  return {
    ...row,
    amount: parseFloat(row.amount.toString()),
    total_balance: parseFloat(row.total_balance.toString()),
    ordering: parseInt(row.ordering.toString(), 10),
    transaction_id: row.transaction_id ?? undefined,
  }
}
