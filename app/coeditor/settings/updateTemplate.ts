'use server'

import { getUserSession, UserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { modifyTemplate, createTemplate, findTemplateById, Template, TemplateInput } from '../Template'
import { PoolClient } from 'pg'
import { validate } from 'validate.js'
import { expectedError } from '@/app/shared/BackendError'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'

const TemplateInputConstraints = {
  id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  name: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  language: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  text: {
    presence: { allowEmpty: true },
    type: 'string',
  },
}

export async function updateTemplate(input: unknown): ActionResponse<Template> {
  return await toResponse(transactional(async (client) => {
    const user = await getUser()
    if (!validateInput(input)) throw expectedError('Invalid input', 400)
    if (await getExistingTemplate(client, user, input)) return await modifyTemplate(client, input)
    else return await createTemplate(client, user.sub, input)
  }))
}

async function getUser(): Promise<UserSession> {
  const user = await getUserSession()
  if (!user) throw expectedError('Unauthorized', 401)
  return user
}

function validateInput(input: unknown): input is TemplateInput {
  const validationResult = validate(input, TemplateInputConstraints, { format: 'flat' }) as string[] | undefined
  if (validationResult?.[0]) throw expectedError(validationResult[0], 400)
  return true
}

async function getExistingTemplate(client: PoolClient, user: UserSession, input: TemplateInput): Promise<Template | undefined> {
  const existingTemplate = await findTemplateById(client, input.id)
  if (existingTemplate && existingTemplate.owner_id !== user.sub)
    throw expectedError('You do not have permission to modify this template', 403)
  return existingTemplate
}
