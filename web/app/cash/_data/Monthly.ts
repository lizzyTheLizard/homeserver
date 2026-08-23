import { Entity, Queryable, removeNull } from '@/app/shared/_external/db/access'
import { MonthlyPeriod } from '../_helper/MonthlyPeriod'
import { fromUrlString, toString } from '../_helper/Period'
import { logger } from '@/app/shared/logger'
import { MonthlyState } from './MonthlyState'

export interface MonthlyInput {
  id: string
  project_id: string
  period: MonthlyPeriod
  shared_account_id: string
  neon_account_id: string
  remaining_account_id: string
  credit_card_account_id: string
  neon_transactions: NeonTransaction[]
  shared_transactions: SharedTransaction[]
  state: MonthlyState
}
export type Monthly = Entity<MonthlyInput>

export interface NeonTransaction {
  date: string
  order: number
  amount: number
  description?: string
  subject?: string
  transaction_id?: string
}

export interface SharedTransaction {
  transaction_id: string
  category: string
}

export async function findForPeriod(client: Queryable, ownerId: string, projectId: string, period: MonthlyPeriod): Promise<Monthly | undefined> {
  const result = await client.query<Monthly>(
    'SELECT * FROM monthly WHERE project_id = $1 AND owner_email = $2 and period = $3',
    [projectId, ownerId, toString(period)],
  )
  if (!result.rows[0]) return undefined
  return removeNull({ ...result.rows[0], period: fromUrlString(result.rows[0].period as unknown as string) as MonthlyPeriod })
}

export async function findBeforePeriod(client: Queryable, ownerId: string, projectId: string, period: MonthlyPeriod): Promise<Monthly | undefined> {
  const result = await client.query<Monthly>(
    'SELECT * FROM monthly WHERE project_id = $1 AND owner_email = $2 and period < $3 ORDER BY period DESC LIMIT 1',
    [projectId, ownerId, toString(period)],
  )
  if (!result.rows[0]) return undefined
  return removeNull({ ...result.rows[0], period: fromUrlString(result.rows[0].period as unknown as string) as MonthlyPeriod })
}

export async function createMonthlyClosing(client: Queryable, ownerId: string, input: MonthlyInput): Promise<Monthly> {
  const result = await client.query<Monthly>(
    'INSERT INTO monthly (id, project_id, owner_email, period, shared_account_id, neon_account_id, remaining_account_id, credit_card_account_id, state, neon_transactions, shared_transactions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *',
    [input.id, input.project_id, ownerId, toString(input.period), input.shared_account_id, input.neon_account_id, input.remaining_account_id, input.credit_card_account_id, input.state, JSON.stringify(input.neon_transactions), JSON.stringify(input.shared_transactions)],
  )
  if (!result.rows[0]) throw new Error('Failed to create monthly closing')
  logger.debug(`Created monthly closing ${input.id} for project ${input.project_id} and period ${toString(input.period)}`)
  return removeNull({ ...result.rows[0], period: fromUrlString(result.rows[0].period as unknown as string) as MonthlyPeriod })
}

export async function modifyMonthlyClosing(client: Queryable, ownerId: string, input: MonthlyInput): Promise<Monthly> {
  const result = await client.query<Monthly>(
    'UPDATE monthly SET shared_account_id = $1, neon_account_id = $2, remaining_account_id = $3, credit_card_account_id = $4, state = $5, neon_transactions = $6, shared_transactions = $7, updated_at = NOW() WHERE id = $8 AND owner_email = $9 RETURNING *',
    [input.shared_account_id, input.neon_account_id, input.remaining_account_id, input.credit_card_account_id, input.state, JSON.stringify(input.neon_transactions), JSON.stringify(input.shared_transactions), input.id, ownerId],
  )
  if (!result.rows[0]) throw new Error('Failed to modify monthly closing')
  logger.debug(`Modified monthly closing ${input.id} for project ${input.project_id} and period ${toString(input.period)}`)
  return removeNull({ ...result.rows[0], period: fromUrlString(result.rows[0].period as unknown as string) as MonthlyPeriod })
}
