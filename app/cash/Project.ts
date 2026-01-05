import { logger } from '@/logger'
import { PoolClient } from 'pg'
import { unexpectedError } from '../shared/BackendError'

export interface Project {
  id: string
  name: string
  archived: boolean
  owner_id: string
  created_at: Date
  updated_at: Date
}

export interface ProjectInput {
  id: string
  name: string
  archived: boolean
  owner_id: string
}

export async function findAllProjects(client: PoolClient): Promise<Project[]> {
  const result = await client.query<Project>(`SELECT * FROM project`)
  logger.debug(`Found ${result.rows.length.toString()} projects in total`)
  return result.rows
}

export async function findProjectsByOwner(client: PoolClient, ownerId: string): Promise<Project[]> {
  const result = await client.query<Project>(`SELECT * FROM project WHERE owner_id = $1`, [ownerId])
  logger.debug(`Found ${result.rows.length.toString()} projects for owner ${ownerId}`)
  return result.rows
}

export async function findProjectById(client: PoolClient, ownerId: string, id: string): Promise<Project | undefined> {
  const result = await client.query<Project>(`SELECT * FROM project WHERE owner_id = $1 AND id = $2`, [ownerId, id])
  logger.debug(`${result.rows[0] ? 'Found' : 'Did not find'} project ${id} for owner ${ownerId}`)
  return result.rows[0]
}

export async function createOrModifyProject(client: PoolClient, project: ProjectInput): Promise<Project> {
  const result1 = await client.query<Project>(`SELECT * FROM project WHERE id = $1`, [project.id])
  const query = result1.rows[0]
    ? 'UPDATE project SET name = $2, owner_id = $3, archived = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *'
    : 'INSERT INTO project (id, name, owner_id, archived) VALUES ($1, $2, $3, $4) RETURNING *'
  const result = await client.query<Project>(query, [project.id, project.name, project.owner_id, project.archived])
  if (!result.rows[0]) throw unexpectedError('Failed to modify project')
  logger.info(`Modified project '${project.name}' for owner ${project.owner_id}`)
  return result.rows[0]
}

export async function removeProject(client: PoolClient, id: string): Promise<void> {
  await client.query(`DELETE FROM project WHERE id = $1`, [id])
  logger.info(`Project ${id} deleted`)
}
