import { logger } from '@/app/shared/logger'
import { PoolClient } from 'pg'
import { endDate, Period, startDate } from '../_helper/Period'

export interface Transaction {
  id: string
  project_id: string
  owner_id: string
  credit_account_id: string
  debit_account_id: string
  amount: number
  date: Date
  description: string
  created_at: Date
  updated_at: Date
}

export interface TransactionInput {
  id: string
  project_id: string
  credit_account_id: string
  debit_account_id: string
  amount: number
  date: Date
  description: string
}

export async function findAllTransactions(client: PoolClient, owner: string, projectId: string, period: Period): Promise<Transaction[]> {
  const from = startDate(period)
  const to = endDate(period)
  const result = await client.query<Transaction>(`SELECT * FROM transaction WHERE project_id = $1 AND date >= $2 AND date < $3 AND owner_id = $4`, [projectId, from, to, owner])
  logger.debug(`Found ${result.rows.length.toString()} projects for project ${projectId}`)
  return result.rows.map(row => ({ ...row, amount: parseFloat(row.amount.toString()) }))
}

export async function findTransactionsById(client: PoolClient, owner: string, id: string): Promise<Transaction | undefined> {
  const result = await client.query<Transaction>('SELECT * FROM transaction WHERE id = $1 AND owner_id = $2', [id, owner])
  if (result.rows.length === 0) logger.debug(`No transaction found with id ${id} for owner ${owner}`)
  else logger.debug(`Found transaction with id ${id} for owner ${owner}`)
  return result.rows[0]
}

export async function createTransaction(client: PoolClient, owner: string, transaction: TransactionInput): Promise<Transaction> {
  const result = await client.query<Transaction>(
    `INSERT INTO transaction (id, project_id, credit_account_id, debit_account_id, amount, date, description, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [transaction.id, transaction.project_id, transaction.credit_account_id, transaction.debit_account_id, transaction.amount, transaction.date, transaction.description, owner],
  )
  if (!result.rows[0]) throw new Error('Failed to create transaction')
  logger.info(`Transaction ${transaction.id} created for owner ${owner}`)
  return { ...result.rows[0], amount: parseFloat(result.rows[0].amount.toString()) }
}

export async function modifyTransaction(client: PoolClient, owner: string, transaction: TransactionInput): Promise<Transaction> {
  const result = await client.query<Transaction>(
    'UPDATE transaction SET credit_account_id = $2, debit_account_id = $3, amount = $4, date = $5, description = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND owner_id = $7 RETURNING *',
    [transaction.id, transaction.credit_account_id, transaction.debit_account_id, transaction.amount, transaction.date, transaction.description, owner],
  )
  logger.info(`Transaction ${transaction.id} updated for owner ${owner}`)
  return { ...result.rows[0], amount: parseFloat(result.rows[0].amount.toString()) }
}

export async function removeTransaction(client: PoolClient, ownerId: string, id: string): Promise<void> {
  await client.query(`DELETE FROM transaction WHERE id = $1 AND owner_id = $2`, [id, ownerId])
  logger.info(`Transaction ${id} deleted for owner ${ownerId}`)
}

export async function findNumberOfTransactions(client: PoolClient, since?: string): Promise<number> {
  if (since === undefined) {
    const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM transaction')
    return parseInt(result.rows[0].count, 10)
  }
  const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM transaction WHERE created_at > $1', [since])
  return parseInt(result.rows[0].count, 10)
}
