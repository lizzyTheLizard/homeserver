import { logger } from '@/app/shared/logger'
import { AccountType } from './AccountType'
import { count, Entity, Queryable, removeNull } from '@/app/shared/_external/db/access'

export interface AccountInput {
  id: string
  project_id: string
  name: string
  type: AccountType
  archived: boolean
}
export type Account = Entity<AccountInput>

export async function findAllAccountsForProject(client: Queryable, ownerId: string, projectId: string): Promise<Account[]> {
  const result = await client.query<Account>(
    'SELECT * FROM account WHERE project_id = $1 AND owner_email = $2 ORDER BY name ASC',
    [projectId, ownerId],
  )
  logger.debug(`Found ${result.rows.length.toString()} accounts for project ${projectId} and owner ${ownerId}`)
  return result.rows.map(removeNull)
}

export async function removeAccount(client: Queryable, ownerId: string, accountId: string): Promise<Account | undefined> {
  const result = await client.query<Account>(
    'DELETE FROM account WHERE id = $1 AND owner_email = $2 RETURNING *',
    [accountId, ownerId],
  )
  logger.debug(`Deleted account with id ${accountId} for owner ${ownerId}`)
  return removeNull(result.rows[0])
}

export async function createOrModifyAccount(client: Queryable, ownerId: string, input: AccountInput): Promise<Account> {
  const result1 = await client.query<Account>(
    'SELECT * FROM account WHERE id = $1 AND owner_email = $2',
    [input.id, ownerId],
  )
  const query = result1.rows[0]
    ? 'UPDATE account SET name = $3, type = $4, archived = $6, updated_at = NOW() WHERE id = $1 AND owner_email = $5 AND project_id=$2 RETURNING *'
    : 'INSERT INTO account (id, project_id, name, type, owner_email, archived, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *'
  const result = await client.query<Account>(query, [input.id, input.project_id, input.name, input.type, ownerId, input.archived])
  if (!result.rows[0]) throw new Error('Failed to modify account')
  logger.debug(`Modified account '${input.name}' for owner ${ownerId}`)
  return removeNull(result.rows[0])
}

export async function findNumberOfAccounts(client: Queryable): Promise<number> {
  return await count(client, 'SELECT COUNT(*) AS count FROM account')
}
