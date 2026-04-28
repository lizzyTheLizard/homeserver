import { PoolClient } from 'pg'
import { endDate, Period, startDate, toString } from '../_helper/Period'
import { Entity, removeNull } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'

export interface ClosingInput {
  id: string
  project_id: string
  date: string
  capital_account_id: string
  profit_account_id: string
  profit: number
}
export type Closing = Entity<ClosingInput>

export async function findAllClosingsByAccount(client: PoolClient, owner: string, accountId: string, period: Period): Promise<Closing[]> {
  const result = await client.query<Closing>(
    `SELECT * FROM closing WHERE owner_email = $1 AND date >= $2 AND date <= $3 AND (capital_account_id = $4 OR profit_account_id = $4) ORDER BY date ASC, id ASC`,
    [owner, startDate(period), endDate(period), accountId],
  )
  logger.debug(`Found ${result.rows.length.toString()} closings for account ${accountId} for ${toString(period)}`)
  return result.rows.map(removeNull)
}

export async function findLastClosing(client: PoolClient, owner: string, projectId: string): Promise<Closing | undefined> {
  const result = await client.query<Closing>(
    `SELECT * FROM closing WHERE project_id = $1 AND owner_email = $2 ORDER BY date DESC LIMIT 1`,
    [projectId, owner],
  )
  if (result.rows.length === 0) logger.debug(`No closing found for project ${projectId} and owner ${owner}`)
  else logger.debug(`Found closing for project ${projectId} and owner ${owner}`)
  return removeNull(result.rows[0])
}

export async function createClosing(client: PoolClient, owner: string, closing: ClosingInput): Promise<Closing> {
  const result = await client.query<Closing>(
    `INSERT INTO closing (id, project_id, date, capital_account_id, profit_account_id, profit, owner_email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [closing.id, closing.project_id, closing.date, closing.capital_account_id, closing.profit_account_id, closing.profit, owner],
  )
  if (!result.rows[0]) throw new Error('Failed to create closing')
  logger.debug(`Closing created for project ${closing.project_id} and owner ${owner}`)
  return removeNull(result.rows[0])
}

export async function removeClosingAfter(client: PoolClient, owner_email: string, projectId: string, fromDate: string): Promise<Closing[]> {
  const result = await client.query<Closing>(
    `DELETE FROM closing WHERE project_id = $1 AND date >= $2 AND owner_email = $3 RETURNING *`,
    [projectId, fromDate, owner_email],
  )
  logger.debug(`Removed ${result.rows.length.toString()} closings for project ${projectId} after ${fromDate}`)
  return result.rows.map(removeNull)
}
