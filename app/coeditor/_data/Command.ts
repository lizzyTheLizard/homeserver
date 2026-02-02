import { PoolClient } from 'pg'
import { logger } from '@/app/shared/logger'
import { BaseEntity, BaseInput, BaseRow, CountResult, countResultToNumber, mapRowToType } from '@/app/shared/_helper/DB'

export interface Command extends BaseEntity {
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

export type CommandInput = BaseInput<Command>

export type PredefinedCommandType = 'INITIALIZE' | 'IMPROVE' | 'REFORMULATE' | 'SUMMARIZE' | 'EXTEND'

export interface CommandResult {
  text: string
  title: string
  durationMs: number
}

type FieldsToOmit = 'text' | 'title' | 'profile' | 'selection_start' | 'selection_end' | 'custom_command' | 'predefined_command'
interface Row extends BaseRow<Command, FieldsToOmit> {
  text: string | null
  title: string | null
  profile: string | null
  selection_start: string | null
  selection_end: string | null
  custom_command: string | null
  predefined_command: PredefinedCommandType | null
}

export async function findNumberOfCommands(client: PoolClient, since?: string): Promise<number> {
  if (since === undefined) {
    const result = await client.query<CountResult>('SELECT COUNT(*) AS count FROM command')
    return countResultToNumber(result)
  }
  const result = await client.query<CountResult>('SELECT COUNT(*) AS count FROM command WHERE created_at > $1', [since])
  return countResultToNumber(result)
}

export async function findCommandsByDiscussion(client: PoolClient, discussionId: string): Promise<Command[]> {
  const result = await client.query<Row>(
    'SELECT * FROM command WHERE discussion_id = $1',
    [discussionId],
  )
  logger.debug(`Found ${result.rows.length.toString()} existing commands for discussion ${discussionId}`)
  return result.rows.map(mapRowToCommand)
}

export async function createCommand(client: PoolClient, owner: string, input: CommandInput): Promise<CommandInput> {
  const result = await client.query<Row>(
    'INSERT INTO command (id, discussion_id, owner_id, text, title, context, language, profile, selection_start, selection_end, result, custom_command, predefined_command) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
    [input.id, input.discussion_id, owner, input.text, input.title, input.context, input.language, input.profile, input.selection_start, input.selection_end, JSON.stringify(input.result), input.custom_command, input.predefined_command],
  )
  if (!result.rows[0]) throw new Error('Failed to insert command')
  logger.info(`Inserted command ${result.rows[0].id} for discussion ${input.discussion_id}`)
  return mapRowToCommand(result.rows[0])
}

function mapRowToCommand(row: Row): Command {
  return {
    ...mapRowToType<Command, FieldsToOmit>(row),
    text: row.text ?? undefined,
    title: row.title ?? undefined,
    profile: row.profile ?? undefined,
    selection_end: row.selection_end ? parseInt(row.selection_end) : undefined,
    selection_start: row.selection_start ? parseInt(row.selection_start) : undefined,
    custom_command: row.custom_command ?? undefined,
    predefined_command: row.predefined_command ?? undefined,
  }
}
