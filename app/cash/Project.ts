import { logger } from '@/logger'
import { PoolClient } from 'pg'

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
  if (result1.rows[0]) {
    const result = await client.query<Project>(
      'UPDATE project SET name = $2, owner_id = $3, archived = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [project.id, project.name, project.owner_id, project.archived],
    )
    logger.info(`Project ${project.id} updated`)
    return result.rows[0]
  }
  else {
    const result = await client.query<Project>(
      `INSERT INTO project (id, name, owner_id, archived) VALUES ($1, $2, $3, $4) RETURNING *`,
      [project.id, project.name, project.owner_id, project.archived],
    )
    logger.info(`Project ${project.id} created`)
    return result.rows[0]
  }
}

export async function removeProject(client: PoolClient, id: string): Promise<void> {
  await client.query(`DELETE FROM project WHERE id = $1`, [id])
  logger.info(`Project ${id} deleted`)
}
