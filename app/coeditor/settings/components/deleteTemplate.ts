'use server'

import { getUserSession, UserSession } from '@/app/common/auth/lib'
import { transactional } from '@/app/db'
import { PoolClient } from 'pg'
import { expectedError, isBackendError } from '@/app/BackendError'
import { findTemplateById, Template, deleteTemplate as deleteTemplateInt } from '../../Template'

export async function deleteTemplate(id: unknown): Promise<{ error?: string }> {
  return transactional(async (client) => {
    const user = await getUser()
    if (!validateInput(id)) throw expectedError('Invalid input', 400)
    if (await getExistingTemplate(client, user, id)) await deleteTemplateInt(client, user.sub, id)
  })
    .then(() => ({}))
    .catch((error: unknown) => {
      if (isBackendError(error)) {
        console.error('Error in deleteTemplate:', error.showStack ? error : error.message)
        return { error: error.userMessage }
      }
      console.error('Error in deleteTemplate:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    })
}

async function getUser(): Promise<UserSession> {
  const user = await getUserSession()
  if (!user) throw expectedError('Unauthorized', 401)
  return user
}

function validateInput(input: unknown): input is string {
  if (typeof input !== 'string' || input.trim() === '') {
    throw expectedError('Id must be a non-empty string', 400)
  }
  return true
}

async function getExistingTemplate(client: PoolClient, user: UserSession, id: string): Promise<Template | undefined> {
  const existingTemplate = await findTemplateById(client, id)
  if (existingTemplate && existingTemplate.owner_id !== user.sub)
    throw expectedError('You do not have permission to modify this template', 403)
  return existingTemplate
}
