import type { PoolClient } from 'pg'
import type { Context } from '../../Context.js'
import type { Template } from './Template.js'

export async function getMyTemplates(context: Context): Promise<Template[]> {
  console.debug(`Fetching templates for ${context.user.email}`)
  return context.db.inTransaction<Template[]>(async (client) => {
    return await findTemplateByOwner(client, context.user.email)
  })
}

async function findTemplateByOwner(client: PoolClient, owner: string): Promise<Template[]> {
  const result = await client.query<Template>('SELECT * FROM template WHERE owner_id = $1', [owner])
  return result.rows
}
