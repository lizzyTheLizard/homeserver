import { PoolClient } from 'pg'
import { logger } from '@/app/shared/logger'
import { Discussion, DiscussionInput, findDiscussionById } from '../_data/Discussion'
import { findTemplateById, Template } from '../_data/Template'
import { findProfileByOwnerAndLanguage, Profile } from '../_data/Profile'
import { aiPort, AiPortInput } from '../_external/AiPort'
import { invalidInput } from '../../shared/_helper/BackendError'

export interface Command {
  id: string
  discussion_id: string
  text?: string
  title?: string
  context: string
  language: string
  profile?: string
  selection_start?: number
  selection_end?: number
  result: CommandResult
  custom_command?: string
  predefined_command?: PredefinedCommandType
}

export type PredefinedCommandType = 'INITIALIZE' | 'IMPROVE' | 'REFORMULATE' | 'SUMMARIZE' | 'EXTEND'

export interface CommandResult {
  text: string
  title: string
  durationMs: number
}

export interface CommandInput {
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

export async function findNumberOfCommands(client: PoolClient, since?: Date): Promise<number> {
  if (since === undefined) {
    const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM command')
    return parseInt(result.rows[0].count, 10)
  }
  const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM command WHERE created_at > $1', [since])
  return parseInt(result.rows[0].count, 10)
}

export async function executeCommand(client: PoolClient, owner: string, input: CommandInput): Promise<Discussion> {
  const template = await findTemplateById(client, owner, input.template_id)
  if (!template) {
    logger.info(`Given template ${input.template_id} not found for owner ${owner}`)
    throw invalidInput(`Given template ${input.template_id} not found`)
  }
  const discussion = await findDiscussionById(client, owner, input.discussion_id)
  const profile = await findProfileByOwnerAndLanguage(client, owner, template.language)
  const aiPortInput = toAiPortInput(input, discussion, template, profile)
  const pastCommands = await findCommandsByDiscussion(client, input.discussion_id)
  const commandResult = await aiPort(aiPortInput, pastCommands)
  const updatedDiscussion = toDiscussionInput(input, aiPortInput.context, commandResult)
  const result = discussion
    ? await modifyDiscussion(client, owner, updatedDiscussion)
    : await createDiscussion(client, owner, updatedDiscussion)
  await createCommand(client, input, aiPortInput, commandResult)
  return result
}

function toAiPortInput(input: CommandInput, discussion: Discussion | undefined, template: Template, profile: Profile | undefined): AiPortInput {
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

async function findCommandsByDiscussion(client: PoolClient, discussionId: string): Promise<Command[]> {
  const result = await client.query<Command>('SELECT * FROM command WHERE discussion_id = $1', [discussionId])
  logger.debug(`Found ${result.rows.length.toString()} existing commands for discussion ${discussionId}`)
  return result.rows.map(row => ({
    ...row,
    text: row.text ?? undefined,
    title: row.title ?? undefined,
    profile: row.profile ?? undefined,
    selection_end: row.selection_end ?? undefined,
    selection_start: row.selection_start ?? undefined,
    custom_command: row.custom_command ?? undefined,
    predefined_command: row.predefined_command ?? undefined,
  }))
}

function toDiscussionInput(input: CommandInput, context: string, commandResult: CommandResult): DiscussionInput {
  return {
    id: input.discussion_id,
    text: commandResult.text,
    title: commandResult.title,
    template_id: input.template_id,
    context: context,
    parameters: input.parameters,
  }
}

async function createCommand(client: PoolClient, input: CommandInput, aiInput: AiPortInput, commandResult: CommandResult): Promise<Command> {
  const result = await client.query<Command>('INSERT INTO command (id, discussion_id, text, title, context, language, profile, selection_start, selection_end, result, custom_command, predefined_command) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
    [input.id, input.discussion_id, aiInput.text, aiInput.title, aiInput.context, aiInput.language, aiInput.profile, input.selection_start, input.selection_end, JSON.stringify(commandResult), input.custom_command, input.predefined_command])
  logger.info(`Inserted command ${result.rows[0].id} for discussion ${input.discussion_id}`)
  return result.rows[0]
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

async function createDiscussion(client: PoolClient, owner: string, input: DiscussionInput): Promise<Discussion> {
  const result = await client.query<Discussion>('INSERT INTO discussion (id, text, title, owner_id, template_id, context, parameters) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [input.id, input.text, input.title, owner, input.template_id, input.context, JSON.stringify(input.parameters)])
  logger.info(`Started new discussion ${result.rows[0].id} for owner ${owner}`)
  return result.rows[0]
}

async function modifyDiscussion(client: PoolClient, owner: string, input: DiscussionInput): Promise<Discussion> {
  const result = await client.query<Discussion>('UPDATE discussion SET text = $2, title = $3, template_id = $4, context = $5, parameters = $6, updated_at = NOW() WHERE id = $1 AND owner_id = $7 RETURNING *',
    [input.id, input.text, input.title, input.template_id, input.context, JSON.stringify(input.parameters), owner])
  logger.info(`Modified discussion ${result.rows[0].id} for owner ${owner}`)
  return result.rows[0]
}
