import type { PoolClient } from 'pg'
import type { Context } from '../../Context.js'
import type { Template } from './Template.js'
import { createTemplate } from './updateTemplate.js'
import { randomUUID } from 'crypto'

export async function getMyTemplates(context: Context): Promise<Template[]> {
  console.debug(`Fetching templates for ${context.user.email}`)
  return context.db.inTransaction<Template[]>(async (client) => {
    const templates = await findTemplateByOwner(client, context.user.email)
    if (templates.length === 0) {
      console.debug('No templates found, inserting default template')
      await createTemplate(client, context.user, { id: randomUUID(), name: 'No Context', language: 'English', text: '' })
      await createTemplate(client, context.user, { id: randomUUID(), name: 'With Context', language: 'English', text: '{context:TEXT}' })
      return await findTemplateByOwner(client, context.user.email)
    }
    return templates
  })
}

export async function findTemplateByOwner(client: PoolClient, owner: string): Promise<Template[]> {
  const result = await client.query<Template>('SELECT * FROM template WHERE owner_id = $1', [owner])
  return result.rows
}

export async function findTemplateById(client: PoolClient, template_id: string): Promise<Template | undefined> {
  const result = await client.query<Template>('SELECT * FROM template WHERE id = $1', [template_id])
  return result.rows[0] ?? undefined
}
