import { logger } from '@/logger'
import { PoolClient } from 'pg'
import { unexpectedError } from '../shared/BackendError'
import { AccountType } from './AccountType'

export interface Account {
  id: string
  project_id: string
  name: string
  type: AccountType
  owner_id: string
  archived: boolean
  created_at: Date
  updated_at: Date
}

export interface AccountInput {
  id: string
  project_id: string
  name: string
  type: AccountType
  archived: boolean
}

export async function findAllAccountsForProject(client: PoolClient, ownerId: string, projectId: string): Promise<Account[]> {
  const result = await client.query<Account>('SELECT * FROM account WHERE project_id = $1 AND owner_id = $2 ORDER BY name ASC',
    [projectId, ownerId],
  )
  logger.debug(`Found ${result.rows.length.toString()} accounts for project ${projectId} and owner ${ownerId}`)
  return result.rows
}

export async function removeAccount(client: PoolClient, ownerId: string, accountId: string): Promise<void> {
  await client.query('DELETE FROM account WHERE id = $1 AND owner_id = $2', [accountId, ownerId])
  logger.info(`Deleted account with id ${accountId} for owner ${ownerId}`)
}

export async function createOrModifyAccount(client: PoolClient, ownerId: string, input: AccountInput): Promise<Account> {
  const result1 = await client.query<Account>(
    'SELECT * FROM account WHERE id = $1 AND owner_id = $2',
    [input.id, ownerId],
  )
  const query = result1.rows[0]
    ? 'UPDATE account SET name = $3, type = $4, archived = $6, updated_at = NOW() WHERE id = $1 AND owner_id = $5 AND project_id=$2 RETURNING *'
    : 'INSERT INTO account (id, project_id, name, type, owner_id, archived, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *'
  const result = await client.query<Account>(query, [input.id, input.project_id, input.name, input.type, ownerId, input.archived])
  if (!result.rows[0]) throw unexpectedError('Failed to modify account')
  logger.info(`Modified account '${input.name}' for owner ${ownerId}`)
  return result.rows[0]
}
