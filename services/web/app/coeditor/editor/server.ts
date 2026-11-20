'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import type { Discussion, DiscussionInput} from '../_data/Discussion';
import { createDiscussion, findDiscussionById, modifyDiscussion } from '../_data/Discussion'
import type { Template } from '../_data/Template';
import { findTemplateById, findTemplatesByOwner } from '../_data/Template'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import notFound from './not-found'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'
import type { ActionResponse} from '@/app/shared/_helper/ActionResponse';
import { toResponse } from '@/app/shared/_helper/ActionResponse'
import type { CommandInput, CommandResult, PredefinedCommandType } from '../_data/Command';
import { PREDEFINED_COMMAND_TYPES, createCommand, findCommandsByDiscussion } from '../_data/Command'
import { validateObject } from '@/app/shared/_helper/validation'
import { invalidInput } from '@/app/shared/_helper/BackendError'
import type { Profile } from '../_data/Profile';
import { findProfileByOwnerAndLanguage } from '../_data/Profile'
import type { AiPortInput } from '../_external/AiPort';
import { aiPort } from '../_external/AiPort'
import z from 'zod'

export interface EditorData {
  discussion: Discussion | undefined
  templates: Template[]
}

export async function loadEditorData(discussionId?: string): Promise<EditorData> {
  const user = await getAuthenticatedUserSession('coeditor'),
   [discussion, templates] = await nontransactional(c => Promise.all([
    discussionId ? findDiscussionById(c, user.email, discussionId) : Promise.resolve(undefined),
    findTemplatesByOwner(c, user.email),
  ]))
  if (discussionId && !discussion) {
    logger.warn(`Discussion with id ${discussionId} not found for user ${user.email}`)
    notFound()
  }
  if (discussion && discussion.owner_email !== user.email) {
    logger.warn(`User ${user.email} not authorized for discussion with id ${discussion.id}`)
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
    const user = await getAuthenticatedUserSession('coeditor')
    validateObject(input, ExecuteCommandInputSchema)
    const template = await findTemplateById(tx, user.email, input.template_id)
    if (!template) {
      throw invalidInput(`Given template ${input.template_id} not found`)
    }
    const discussion = await findDiscussionById(tx, user.email, input.discussion_id),
     profile = await findProfileByOwnerAndLanguage(tx, user.email, template.language),
     aiPortInput = toAiPortInput(input, discussion, template, profile),
     pastCommands = await findCommandsByDiscussion(tx, input.discussion_id),
     commandResult = isNewRequestWithoutContext(input, discussion, aiPortInput.context)
      ? { text: '', title: '' }
      : await aiPort(aiPortInput, pastCommands),
     updatedDiscussion = toDiscussionInput(input, aiPortInput.context, commandResult),
     result = discussion
      ? await modifyDiscussion(tx, user.email, updatedDiscussion)
      : await createDiscussion(tx, user.email, updatedDiscussion),
     command = toCommand(input, aiPortInput, commandResult)
    await createCommand(tx, user.email, command)
    if (discussion) {
      logger.info(`Executed command for discussion ${result.id} by user ${user.email} with template ${template.name}`)
      await logEvent(tx, 'INFO', `Executed CoEditor command on discussion ${result.id}`)
    }
    else {
      logger.info(`Created new discussion ${result.id} by user ${user.email} with template ${template.name}`)
      await logEvent(tx, 'INFO', `Created CoEditor discussion ${result.id}`)
    }
    return result
  }))
}

function toAiPortInput(input: ExecuteCommandInput, discussion: Discussion | undefined, template: Template, profile: Profile | undefined): AiPortInput {
  return {
    context: createContextString(template, input.parameters),
    custom_command: input.custom_command,
    language: template.language,
    predefined_command: input.predefined_command,
    profile: profile?.text,
    selection_end: input.selection_end,
    selection_start: input.selection_start,
    text: input.text,
    title: discussion?.title,
  }
}

function toDiscussionInput(input: ExecuteCommandInput, context: string, commandResult: CommandResult): DiscussionInput {
  return {
    context,
    id: input.discussion_id,
    parameters: input.parameters,
    template_id: input.template_id,
    text: commandResult.text,
    title: commandResult.title,
  }
}

function createContextString(template: Template, values: Record<string, string>): string {
  let result = template.text,
   offset = 0
  for (const param of template.parameters) {
    if (!(param.name in values))
      {throw invalidInput(`Value for parameter '${param.name}' is missing`)}
    const value = values[param.name]
    result = result.substring(0, param.startPosition + offset) + value + result.substring(param.endPosition + offset)
    offset += value.length - (param.endPosition - param.startPosition)
  }
  return result
}

function toCommand(input: ExecuteCommandInput, aiInput: AiPortInput, commandResult: CommandResult): CommandInput {
  return {
    ...input,
    context: aiInput.context,
    language: aiInput.language,
    result: commandResult,
  }
}

function isNewRequestWithoutContext(input: ExecuteCommandInput, discussion: Discussion | undefined, context: string): boolean {
  return discussion === undefined && input.predefined_command === 'INITIALIZE' && !context.trim()
}

const ExecuteCommandInputSchema = z.object({
  custom_command: z.string().optional(),
  discussion_id: z.uuid(),
  id: z.uuid(),
  parameters: z.record(z.string(), z.string()),
  predefined_command: z.enum(PREDEFINED_COMMAND_TYPES).optional(),
  selection_end: z.number().optional(),
  selection_start: z.number().optional(),
  template_id: z.uuid(),
  text: z.string(),
})
