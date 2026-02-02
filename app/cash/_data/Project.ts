import { BaseEntity, BaseInput, BaseRow, CountResult, countResultToNumber, mapRowToType } from '@/app/shared/_helper/DB'
import { logger } from '@/app/shared/logger'
import { PoolClient } from 'pg'

export interface Project extends BaseEntity {
  id: string
  name: string
  archived: boolean
}

export interface ProjectInput extends BaseInput<Project> {
  owner_id: string
}

export async function findAllProjects(client: PoolClient): Promise<Project[]> {
  const result = await client.query<BaseRow<Project>>(
    `SELECT * FROM project`,
  )
  logger.debug(`Found ${result.rows.length.toString()} projects in total`)
  return result.rows.map(row => mapRowToType(row))
}

export async function findProjectsByOwner(client: PoolClient, ownerId: string): Promise<Project[]> {
  const result = await client.query<BaseRow<Project>>(
    `SELECT * FROM project WHERE owner_id = $1`,
    [ownerId],
  )
  logger.debug(`Found ${result.rows.length.toString()} projects for owner ${ownerId}`)
  return result.rows.map(row => mapRowToType(row))
}

export async function findProjectById(client: PoolClient, ownerId: string, id: string): Promise<Project | undefined> {
  const result = await client.query<BaseRow<Project>>(
    `SELECT * FROM project WHERE owner_id = $1 AND id = $2`,
    [ownerId, id],
  )
  logger.debug(`${result.rows[0] ? 'Found' : 'Did not find'} project ${id} for owner ${ownerId}`)
  return mapRowToType(result.rows[0])
}

export async function createOrModifyProject(client: PoolClient, project: ProjectInput): Promise<Project> {
  const result1 = await client.query<BaseRow<Project>>(
    `SELECT * FROM project WHERE id = $1`,
    [project.id],
  )
  const query = result1.rows[0]
    ? 'UPDATE project SET name = $2, owner_id = $3, archived = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *'
    : 'INSERT INTO project (id, name, owner_id, archived) VALUES ($1, $2, $3, $4) RETURNING *'
  const result = await client.query<BaseRow<Project>>(query, [project.id, project.name, project.owner_id, project.archived])
  if (!result.rows[0]) throw new Error('Failed to modify project')
  logger.info(`Modified project '${project.name}' for owner ${project.owner_id}`)
  return mapRowToType(result.rows[0])
}

export async function removeProject(client: PoolClient, id: string): Promise<void> {
  await client.query(
    `DELETE FROM project WHERE id = $1`,
    [id],
  )
  logger.info(`Project ${id} deleted`)
}

export async function findNumberOfProjects(client: PoolClient): Promise<number> {
  const result = await client.query<CountResult>('SELECT COUNT(*) AS count FROM project')
  return countResultToNumber(result)
}

export async function findNumberOfUsersWithProjects(client: PoolClient): Promise<number> {
  const result = await client.query<CountResult>('SELECT COUNT(DISTINCT owner_id) AS count FROM project')
  return countResultToNumber(result)
}
