import { PoolClient } from 'pg'
import { logger } from 'storybook/internal/node-logger'

export interface Closing {
  id: string
  project_id: string
  date: Date
  capital_account_id: string
  profit_account_id: string
  profit: number
  created_at: Date
  updated_at: Date
}

export interface ClosingInput {
  id: string
  project_id: string
  date: Date
  capital_account_id: string
  profit_account_id: string
  profit: number
}

export async function findLastClosing(client: PoolClient, owner: string, projectId: string): Promise<Closing | undefined> {
  const result = await client.query<Closing>(
    `SELECT * FROM closing WHERE project_id = $1 AND owner_id = $2 ORDER BY date DESC LIMIT 1`,
    [projectId, owner],
  )
  if (result.rows.length === 0) logger.debug(`No closing found for project ${projectId} and owner ${owner}`)
  else logger.debug(`Found closing for project ${projectId} and owner ${owner}`)
  return result.rows[0]
}

export async function createClosing(client: PoolClient, owner: string, closing: ClosingInput): Promise<Closing> {
  const result = await client.query<Closing>(
    `INSERT INTO closing (id, project_id, date, capital_account_id, profit_account_id, profit, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [closing.id, closing.project_id, closing.date, closing.capital_account_id, closing.profit_account_id, closing.profit, owner],
  )
  if (!result.rows[0]) throw new Error('Failed to create closing')
  logger.info(`Closing created for project ${closing.project_id} and owner ${owner}`)
  return result.rows[0]
}
