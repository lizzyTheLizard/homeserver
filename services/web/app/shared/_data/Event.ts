import { Queryable, removeNull, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'

export const EventLevels = ['INFO', 'WARN', 'ERROR']
export type EventLevel = typeof EventLevels[number]

export interface Event {
  id: string
  time: string
  level: EventLevel
  message: string
}

export async function logEvent(client: Queryable | undefined, level: EventLevel, message: string): Promise<void> {
  if (!client) {
    await transactional(async tx => logEvent(tx, level, message))
    return
  }
  const id = randomUUID()
  await client.query('INSERT INTO events (id, level, message) VALUES ($1, $2, $3)', [id, level, message])
}

export async function findRecentEvents(client: Queryable): Promise<Event[]> {
  const result = await client.query<Event>(
    `SELECT id, time, level, message FROM events WHERE time >= NOW() - INTERVAL '24 hours' ORDER BY time DESC, id DESC`,
  )
  return result.rows.map(removeNull)
}
