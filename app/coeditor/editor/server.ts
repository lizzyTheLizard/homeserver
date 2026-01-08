'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createDiscussion, Discussion, DiscussionInput, findDiscussionById, modifyDiscussion } from '../_data/Discussion'
import { findTemplateById, findTemplatesByOwner, Template } from '../_data/Template'
import { nontransactional, transactional } from '@/app/shared/db'
import notFound from './not-found'
import { logger } from '@/app/shared/logger'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { Command, CommandResult, createCommand, findCommandsByDiscussion, PredefinedCommandType } from '../_data/Command'
import { validateObject } from '@/app/shared/_helper/validation'
import { invalidInput } from '@/app/shared/_helper/BackendError'
import { findProfileByOwnerAndLanguage, Profile } from '../_data/Profile'
import { aiPort, AiPortInput } from '../_external/AiPort'

export interface EditorData {
  discussion: Discussion | undefined
  templates: Template[]
}

export async function loadEditorData(discussionId?: string): Promise<EditorData> {
  const user = await getAuthenticatedUserSession('cash')
  const [discussion, templates] = await nontransactional(async c => ([
    discussionId ? await findDiscussionById(c, user.sub, discussionId) : undefined,
    await findTemplatesByOwner(c, user.sub),
  ]))
  if (discussionId && !discussion) {
    logger.info(`Discussion with id ${discussionId} not found for user ${user.sub}`)
    notFound()
  }
  if (discussion && discussion.owner_id !== user.sub) {
    logger.info(`User ${user.sub} not authorized for discussion with id ${discussion.id}`)
    notFound()
  }
  return { discussion, templates }
}

export interface ExecuteCommandInput {
  id: string
  discussion_id: string
  template_id: string
  text: string
  parameters: Record<string, string>
  selection_start?: number
  selection_end?: number
  custom_command?: string
  predefined_command?: PredefinedCommandType
}

export async function executeCommand(input: ExecuteCommandInput): ActionResponse<Discussion> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession('cash')
    validateObject(input, ExecuteCommandInputConstraints)
    const template = await findTemplateById(tx, user.sub, input.template_id)
    if (!template) {
      logger.info(`Given template ${input.template_id} not found for owner ${user.sub}`)
      throw invalidInput(`Given template ${input.template_id} not found`)
    }
    const discussion = await findDiscussionById(tx, user.sub, input.discussion_id)
    const profile = await findProfileByOwnerAndLanguage(tx, user.sub, template.language)
    const aiPortInput = toAiPortInput(input, discussion, template, profile)
    const pastCommands = await findCommandsByDiscussion(tx, input.discussion_id)
    const commandResult = await aiPort(aiPortInput, pastCommands)
    const updatedDiscussion = toDiscussionInput(input, aiPortInput.context, commandResult)
    const result = discussion
      ? await modifyDiscussion(tx, user.sub, updatedDiscussion)
      : await createDiscussion(tx, user.sub, updatedDiscussion)
    const command = toCommand(input, aiPortInput, commandResult)
    await createCommand(tx, command)
    return result
  }))
}

function toAiPortInput(input: ExecuteCommandInput, discussion: Discussion | undefined, template: Template, profile: Profile | undefined): AiPortInput {
  return {
    text: input.text,
    title: discussion?.title,
    context: createContextString(template, input.parameters),
    language: template.language,
    profile: profile?.text,
    selection_start: input.selection_start,
    selection_end: input.selection_end,
    custom_command: input.custom_command,
    predefined_command: input.predefined_command,
  }
}

function toDiscussionInput(input: ExecuteCommandInput, context: string, commandResult: CommandResult): DiscussionInput {
  return {
    id: input.discussion_id,
    text: commandResult.text,
    title: commandResult.title,
    template_id: input.template_id,
    context: context,
    parameters: input.parameters,
  }
}

function createContextString(template: Template, values: Record<string, string>): string {
  let result = template.text
  let offset = 0
  for (const param of template.parameters) {
    if (!(param.name in values))
      throw invalidInput(`Vale for parameter '${param.name}' is missing`)
    const value = values[param.name]
    result = result.substring(0, param.startPosition + offset) + value + result.substring(param.endPosition + offset)
    offset += value.length - (param.endPosition - param.startPosition)
  }
  return result
}

function toCommand(input: ExecuteCommandInput, aiInput: AiPortInput, commandResult: CommandResult): Command {
  return {
    ...input,
    context: aiInput.context,
    result: commandResult,
    language: aiInput.language,
  }
}

const ExecuteCommandInputConstraints = {
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
