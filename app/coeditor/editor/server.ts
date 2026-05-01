'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createDiscussion, Discussion, DiscussionInput, findDiscussionById, modifyDiscussion } from '../_data/Discussion'
import { findTemplateById, findTemplatesByOwner, Template } from '../_data/Template'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import notFound from './not-found'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { CommandInput, CommandResult, createCommand, findCommandsByDiscussion, PREDEFINED_COMMAND_TYPES, PredefinedCommandType } from '../_data/Command'
import { validateObject } from '@/app/shared/_helper/validation'
import { invalidInput } from '@/app/shared/_helper/BackendError'
import { findProfileByOwnerAndLanguage, Profile } from '../_data/Profile'
import { aiPort, AiPortInput } from '../_external/AiPort'
import z from 'zod'

export interface EditorData {
  discussion: Discussion | undefined
  templates: Template[]
}

export async function loadEditorData(discussionId?: string): Promise<EditorData> {
  const user = await getAuthenticatedUserSession('coeditor')
  const [discussion, templates] = await nontransactional(c => Promise.all([
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
    const discussion = await findDiscussionById(tx, user.email, input.discussion_id)
    const profile = await findProfileByOwnerAndLanguage(tx, user.email, template.language)
    const aiPortInput = toAiPortInput(input, discussion, template, profile)
    const pastCommands = await findCommandsByDiscussion(tx, input.discussion_id)
    const commandResult = await aiPort(aiPortInput, pastCommands)
    const updatedDiscussion = toDiscussionInput(input, aiPortInput.context, commandResult)
    const result = discussion
      ? await modifyDiscussion(tx, user.email, updatedDiscussion)
      : await createDiscussion(tx, user.email, updatedDiscussion)
    const command = toCommand(input, aiPortInput, commandResult)
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
      throw invalidInput(`Value for parameter '${param.name}' is missing`)
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
    result: commandResult,
    language: aiInput.language,
  }
}

const ExecuteCommandInputSchema = z.object({
  id: z.uuid(),
  discussion_id: z.uuid(),
  template_id: z.uuid(),
  text: z.string(),
  parameters: z.record(z.string(), z.string()),
  selection_start: z.number().optional(),
  selection_end: z.number().optional(),
  custom_command: z.string().optional(),
  predefined_command: z.enum(PREDEFINED_COMMAND_TYPES).optional(),
})
