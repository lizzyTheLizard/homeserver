import { Entity, removeNull } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'
import { PoolClient } from 'pg'

export interface FavoriteInput {
  id: string
  position: number
  name: string
  url: string
  description: string
}

export type Favorite = Entity<FavoriteInput>

export async function findFavoritesByOwner(client: PoolClient, ownerId: string): Promise<Favorite[]> {
  const result = await client.query<Favorite>(
    'SELECT * FROM user_favorite WHERE owner_id = $1 ORDER BY position ASC, name ASC',
    [ownerId],
  )
  logger.debug(`Found ${result.rows.length.toString()} favorites for owner ${ownerId}`)
  return result.rows.map(removeNull)
}

export async function createOrModifyFavorite(client: PoolClient, ownerId: string, input: FavoriteInput): Promise<Favorite> {
  const result1 = await client.query<Favorite>(
    `SELECT * FROM user_favorite WHERE id = $1 AND owner_id = $2`,
    [input.id, ownerId],
  )
  const query = result1.rows[0]
    ? 'UPDATE user_favorite SET position = $3, name = $4, url = $5, description = $6, updated_at = NOW() WHERE id = $1 AND owner_id = $2 RETURNING *'
    : 'INSERT INTO user_favorite (id, owner_id, position, name, url, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *'
  const result = await client.query<Favorite>(query, [input.id, ownerId, input.position, input.name, input.url, input.description])
  if (!result.rows[0]) throw new Error('Failed to modify favorite')
  logger.debug(`Modified favorite '${input.name}' for owner ${ownerId}`)
  return removeNull(result.rows[0])
}

export async function removeFavorite(client: PoolClient, ownerId: string, id: string): Promise<Favorite | undefined> {
  const result = await client.query<Favorite>(
    'DELETE FROM user_favorite WHERE id = $1 AND owner_id = $2 RETURNING *',
    [id, ownerId],
  )
  logger.info(`Deleted favorite with id ${id} for owner ${ownerId}`)
  return result.rows[0] ? removeNull(result.rows[0]) : undefined
}
