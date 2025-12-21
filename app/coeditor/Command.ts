import { PoolClient } from 'pg'
import { logger } from '@/logger'

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

export async function findCommandsByDiscussion(client: PoolClient, discussionId: string): Promise<Command[]> {
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

export async function createCommand(client: PoolClient, input: Command): Promise<Command> {
  const result = await client.query<Command>('INSERT INTO command (id, discussion_id, text, title, context, language, profile, selection_start, selection_end, result, custom_command, predefined_command) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
    [input.id, input.discussion_id, input.text, input.title, input.context, input.language, input.profile, input.selection_start, input.selection_end, JSON.stringify(input.result), input.custom_command, input.predefined_command])
  logger.info(`Inserted command ${result.rows[0].id} for discussion ${input.discussion_id}`)
  return result.rows[0]
}
