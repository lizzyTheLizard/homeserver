import type { PoolClient } from 'pg'
import type { Command, CommandResult, PredefinedCommandType } from './Command.js'
import { unexpectedError } from '../../BackendError.js'

export async function findCommandsByDiscussionId(client: PoolClient, discussionId: string): Promise<Command[]> {
  const result = await client.query<CommandDbRow> ('SELECT * FROM command WHERE discussion_id = $1 ORDER BY created_at ASC', [discussionId])
  return result.rows.map(row => dbToObject(row))
}

export async function findCommandById(client: PoolClient, id: string): Promise<Command | undefined> {
  const result = await client.query<CommandDbRow>('SELECT * FROM command WHERE id = $1 ', [id])
  if (!result.rows[0]) return undefined
  return dbToObject(result.rows[0])
}

// It is a bit tricky to map the database row to the Command interface due to the union types and nullable fields.
function dbToObject(row: CommandDbRow): Command {
  const result = {
    id: row.id,
    discussion_id: row.discussion_id,
    text: row.text ?? undefined,
    title: row.title ?? undefined,
    context: row.context,
    language: row.language,
    profile: row.profile ?? undefined,
    selection_start: row.selection_start ?? undefined,
    selection_end: row.selection_end ?? undefined,
    result: row.result,
  }
  if ('custom_command' in row && row.custom_command !== null)
    return { ...result, custom_command: row.custom_command }
  else if ('predefined_command' in row && row.predefined_command !== null)
    return { ...result, predefined_command: row.predefined_command }
  else
    throw unexpectedError('Invalid command row from database', 500, 'Technical Error')
}

interface CommandDbRow {
  id: string
  discussion_id: string
  text: string | null
  title: string | null
  context: string
  language: string
  profile: string | null
  selection_start: number | null
  selection_end: number | null
  custom_command: string | null
  predefined_command: PredefinedCommandType | null
  result: CommandResult
}
