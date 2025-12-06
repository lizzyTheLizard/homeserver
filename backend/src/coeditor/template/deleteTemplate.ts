import type { PoolClient } from 'pg'
import type { Context } from '../../Context.js'
import { findTemplateById } from './getTemplates.js'
import { expectedError } from '../../BackendError.js'

export async function deleteTemplate(context: Context, id: string): Promise<void> {
  console.debug(`Deleting template ${id} for ${context.user.email}`)

  await context.db.inTransaction(async (client) => {
    const existing = await findTemplateById(client, id)
    if (!existing) return
    if (existing.owner_id !== context.user.email) throw expectedError('You do not have permission to delete this template', 403, 'Forbidden')
    await deleteExistingTemplate(client, id)
  })
}

async function deleteExistingTemplate(client: PoolClient, id: string): Promise<void> {
  await client.query(
    'DELETE FROM template WHERE id = $1',
    [id],
  )
}
