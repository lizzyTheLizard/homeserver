import { PoolClient } from 'pg'
import { endDate, Period, periodToString, startDate } from '../_helper/Period'
import { logger } from '@/app/shared/logger'
import { Temporal } from '@js-temporal/polyfill'
import { BaseEntity, BaseInput, BaseRow, mapRowToType } from '@/app/shared/_helper/DB'

export interface AccountTransaction extends BaseEntity {
  id: string
  ordering: number
  account_id: string
  other_account_id: string
  amount: number
  total_balance: number
  date: Temporal.PlainDate
  transaction_id?: string
  description?: string
}

export type AccountTransactionInput = BaseInput<AccountTransaction>

type FieldsToOmit = 'transaction_id' | 'description' | 'date' | 'amount' | 'total_balance' | 'ordering'
interface Row extends BaseRow<AccountTransaction, FieldsToOmit> {
  ordering: string
  amount: string
  total_balance: string
  date: Date
  transaction_id: string | null
  description: string | null
}

export async function deleteAccountTransactions(client: PoolClient, owner: string, accountId: string, period: Period): Promise<void> {
  await client.query(
    'DELETE FROM account_transaction WHERE account_id = $1 AND owner_id = $2 AND date >= $3 AND date < $4',
    [accountId, owner, startDate(period), endDate(period)],
  )
  logger.debug(`Deleting account transactions for account ${accountId} in period ${periodToString(period)}`)
}

export async function findAllAccountTransactionsInPeriod(client: PoolClient, owner: string, accountId: string, period: Period): Promise<AccountTransaction[]> {
  const result = await client.query<Row>(
    'SELECT * FROM account_transaction WHERE account_id = $1 AND owner_id = $2 AND date >= $3 AND date < $4 ORDER BY date DESC, ordering DESC',
    [accountId, owner, startDate(period), endDate(period)],
  )
  logger.debug(`Finding ${result.rows.length.toString()} account transactions for account ${accountId} in period ${periodToString(period)}`)
  return result.rows.map(row => mapRowToAccountTransaction(row))
}

export async function findLatestAccountTransactionBefore(client: PoolClient, owner: string, accountId: string, period: Period): Promise<AccountTransaction | undefined> {
  const result = await client.query<Row>(
    'SELECT * FROM account_transaction WHERE account_id = $1 AND owner_id = $2 AND date < $3 ORDER BY date DESC, ordering DESC LIMIT 1',
    [accountId, owner, startDate(period)],
  )
  if (result.rows.length === 0) return undefined
  logger.debug(`Finding last account transaction before period ${periodToString(period)} for account ${accountId}`)
  return result.rows[0] ? mapRowToAccountTransaction(result.rows[0]) : undefined
}

export async function createAccountTransaction(client: PoolClient, owner: string, input: AccountTransactionInput): Promise<AccountTransaction> {
  const result = await client.query<Row>(
    'INSERT INTO account_transaction (id, ordering, account_id, other_account_id, amount, total_balance, date, transaction_id, description, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
    [input.id, input.ordering, input.account_id, input.other_account_id, input.amount, input.total_balance, input.date.toString(), input.transaction_id, input.description, owner],
  )
  if (!result.rows[0]) throw new Error('Failed to create account transaction')
  logger.debug(`Creating account transaction for account ${input.account_id} on date ${input.date.toString()}`)
  return mapRowToAccountTransaction(result.rows[0])
}

function mapRowToAccountTransaction(row: Row): AccountTransaction {
  return {
    ...mapRowToType<AccountTransaction, FieldsToOmit>(row),
    amount: parseFloat(row.amount),
    total_balance: parseFloat(row.total_balance),
    ordering: parseInt(row.ordering, 10),
    transaction_id: row.transaction_id ?? undefined,
    date: Temporal.PlainDate.from(row.date.toISOString().substring(0, 10)),
  }
}
