import type { PoolClient } from 'pg'

export interface Context {
  user: UserInfo
  db: DatabaseHandle
  event: Event
}

export interface Event {
  httpMethod: string
  body: string | null
  path: string
  headers: Record<string, unknown> | null
}

export interface UserInfo {
  accessToken: string
  email: string
}

export interface DatabaseHandle {
  inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>
}
