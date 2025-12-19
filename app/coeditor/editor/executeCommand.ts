'use server'

import { logger } from '@/logger'
import { createCommand, findCommandsByDiscussion, PredefinedCommandType } from '../Command'
import { Discussion, findDiscussionById, modifyDiscussion, startDiscussion } from '../Discussion'
import { getUserSession, UserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/db'
import { createContextString, findTemplateById, Template } from '../Template'
import { findProfileByOwnerAndLanguage } from '../Profile'
import { validate } from 'validate.js'
import { expectedError, isBackendError } from '@/app/BackendError'
import { PoolClient } from 'pg'
import { aiPort, CommandWithoutResult } from './aiPort'

export interface CommandInput {
  id: string
  discussion_id: string
  template_id: string
  text: string
  parameters: Record<string, string>
  selection_start?: number
  selection_end?: number
  customCommand?: string
  predefinedCommand?: PredefinedCommandType
}

const CommandInputConstraints = {
  id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  discussion_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  template_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  text: {
    presence: { allowEmpty: true },
    type: 'string',
  },
  parameters: {
    presence: true,
    type: 'object',
  },
  selection_start: {
    presence: false,
    type: 'number',
  },
  selection_end: {
    presence: false,
    type: 'number',
  },
  customCommand: {
    presence: false,
    type: 'string',
  },
  predefinedCommand: {
    presence: false,
    type: 'string',
    inclusion: {
      within: ['INITIALIZE', 'IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND'],
      message: 'must be one of INITIALIZE, IMPROVE, REFORMULATE, SUMMARIZE, EXTEND',
    },
  },
}

export async function executeCommand(input: unknown): Promise<Discussion | { error: string }> {
  const user = await getUser()
  if (!validateInput(input)) throw expectedError('Invalid input', 400)

  return transactional(async (client) => {
    const template = await getTemplate(client, user.sub, input.template_id)
    const discussion = await getDiscussion(client, user.sub, input)
    const context = createContextString(template, input.parameters)
    const profile = await findProfileByOwnerAndLanguage(client, user.sub, template.language)
    const command: CommandWithoutResult = {
      id: input.id,
      discussion_id: input.discussion_id,
      text: input.text,
      title: discussion?.title,
      context,
      language: template.language,
      profile: profile?.text,
      selection_start: input.selection_start,
      selection_end: input.selection_end,
      custom_command: input.customCommand,
      predefined_command: input.predefinedCommand,
    }
    const pastCommands = await findCommandsByDiscussion(client, command.discussion_id)
    const commandResult = await aiPort(command, pastCommands)
    const result = discussion
      ? await modifyDiscussion(client, user.sub, { ...input, ...commandResult, id: input.discussion_id, context })
      : await startDiscussion(client, user.sub, { ...input, ...commandResult, id: input.discussion_id, context })
    await createCommand(client, { ...command, result: commandResult })
    return result
  }).catch((error: unknown) => {
    if (isBackendError(error) && error.showStack) {
      logger.error('Error in executeCommand', error)
      return { error: error.userMessage }
    }
    else if (isBackendError(error)) {
      logger.error('Error in executeCommand: ' + error.message)
      return { error: error.userMessage }
    }
    logger.error('Unknown error in executeCommand:', error)
    console.error(error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  })
}

async function getUser(): Promise<UserSession> {
  const user = await getUserSession()
  if (!user) throw expectedError('Unauthorized', 401)
  return user
}

function validateInput(input: unknown): input is CommandInput {
  const validationResult = validate(input, CommandInputConstraints, { format: 'flat' }) as string[] | undefined
  if (validationResult?.[0]) throw expectedError(validationResult[0], 400)
  return true
}

async function getTemplate(client: PoolClient, owner: string, id: string): Promise<Template> {
  const template = await findTemplateById(client, id)
  if (!template) throw expectedError('Template not found', 404)
  if (template.owner_id !== owner) throw expectedError('Not allowed to access template', 403)
  return template
}

async function getDiscussion(client: PoolClient, owner: string, input: CommandInput): Promise<Discussion | undefined> {
  const discussion = await findDiscussionById(client, input.discussion_id)
  if (!discussion) return undefined
  if (discussion.owner_id !== owner) throw expectedError('Not allowed to access discussion', 403)
  return discussion
}
