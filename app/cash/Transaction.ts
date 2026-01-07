import { logger } from '@/logger'
import { PoolClient } from 'pg'
import { invalidInput } from '../shared/BackendError'
import { Period } from './Period'

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
  const from = period.startDate()
  const to = period.endDate()
  const result = await client.query<Transaction>(`SELECT * FROM transaction WHERE project_id = $1 AND date >= $2 AND date < $3 AND owner_id = $4`, [projectId, from, to, owner])
  logger.debug(`Found ${result.rows.length.toString()} projects for project ${projectId}`)
  return result.rows.map(row => ({ ...row, amount: parseFloat(row.amount.toString()) }))
}

export async function createOrModifyTransaction(client: PoolClient, owner: string, transaction: TransactionInput): Promise<Transaction> {
  const result1 = await client.query<Transaction>(`SELECT * FROM transaction WHERE id = $1 AND owner_id = $2`, [transaction.id, owner])
  if (result1.rows[0]) {
    if (result1.rows[0].project_id !== transaction.project_id) throw invalidInput('Cannot change project of existing transaction')
    ensureNotClosed(result1.rows[0].project_id, [result1.rows[0].date, transaction.date])
    const result = await client.query<Transaction>(
      'UPDATE transaction SET credit_account_id = $2, debit_account_id = $3, amount = $4, date = $5, description = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND owner_id = $7 RETURNING *',
      [transaction.id, transaction.credit_account_id, transaction.debit_account_id, transaction.amount, transaction.date, transaction.description, owner],
    )
    logger.info(`Transaction ${transaction.id} updated for owner ${owner}`)
    // TODO: Update account transaction summaries
    return { ...result.rows[0], amount: parseFloat(result.rows[0].amount.toString()) }
  }
  else {
    ensureNotClosed(transaction.project_id, [transaction.date])
    const result = await client.query<Transaction>(
      `INSERT INTO transaction (id, project_id, credit_account_id, debit_account_id, amount, date, description, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [transaction.id, transaction.project_id, transaction.credit_account_id, transaction.debit_account_id, transaction.amount, transaction.date, transaction.description, owner],
    )
    if (!result.rows[0]) throw new Error('Failed to create transaction')
    logger.info(`Transaction ${transaction.id} created for owner ${owner}`)
    // TODO: Update account transaction summaries
    return { ...result.rows[0], amount: parseFloat(result.rows[0].amount.toString()) }
  }
}

export async function removeTransaction(client: PoolClient, ownerId: string, id: string): Promise<void> {
  const result1 = await client.query<Transaction>(`SELECT * FROM transaction WHERE id = $1 AND owner_id = $2`, [id, ownerId])
  if (result1.rows[0]) {
    ensureNotClosed(result1.rows[0].project_id, [result1.rows[0].date])
    await client.query(`DELETE FROM transaction WHERE id = $1 AND owner_id = $2`, [id, ownerId])
    logger.info(`Transaction ${id} deleted for owner ${ownerId}`)
    // TODO: Update account transaction summaries
  }
  else {
    logger.info(`Transaction ${id} not found for owner ${ownerId}, nothing to delete`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ensureNotClosed(projectId: string, date: Date[]) {
  // TODO: Implement checking for closed periods
  return
}
