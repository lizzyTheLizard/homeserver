import { PoolClient } from 'pg'
import { logger } from '@/app/shared/logger'
import { count, Entity, removeNull } from '@/app/shared/_external/db/access'

export interface CommandInput {
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
export type Command = Entity<CommandInput>

export const PREDEFINED_COMMAND_TYPES = ['INITIALIZE', 'IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND'] as const
export type PredefinedCommandType = typeof PREDEFINED_COMMAND_TYPES[number]

export interface CommandResult {
  text: string
  title: string
  durationMs: number
}

export function findNumberOfCommands(client: PoolClient, since?: string): Promise<number> {
  if (since === undefined) {
    return count(client, 'SELECT COUNT(*) AS count FROM command')
  }
  return count(client, 'SELECT COUNT(*) AS count FROM command WHERE created_at > $1', [since])
}

export async function findCommandsByDiscussion(client: PoolClient, discussionId: string): Promise<Command[]> {
  const result = await client.query<Command>(
    'SELECT * FROM command WHERE discussion_id = $1',
    [discussionId],
  )
  logger.debug(`Found ${result.rows.length.toString()} existing commands for discussion ${discussionId}`)
  return result.rows.map(removeNull)
}

export async function createCommand(client: PoolClient, owner: string, input: CommandInput): Promise<CommandInput> {
  const result = await client.query<Command>(
    'INSERT INTO command (id, discussion_id, owner_email, text, title, context, language, profile, selection_start, selection_end, result, custom_command, predefined_command) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
    [input.id, input.discussion_id, owner, input.text, input.title, input.context, input.language, input.profile, input.selection_start, input.selection_end, JSON.stringify(input.result), input.custom_command, input.predefined_command],
  )
  if (!result.rows[0]) throw new Error('Failed to insert command')
  logger.debug(`Inserted command ${result.rows[0].id} for discussion ${input.discussion_id}`)
  return removeNull(result.rows[0])
}
