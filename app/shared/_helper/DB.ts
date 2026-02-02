// TODO: Use pg-types instead of manual mapping

import { Temporal } from '@js-temporal/polyfill'
import { QueryResult } from 'pg'

export interface BaseEntity {
  created_at: Temporal.Instant
  updated_at: Temporal.Instant
  owner_id: string
}

export type BaseInput<T extends BaseEntity> = Omit<T, 'created_at' | 'updated_at' | 'owner_id'>

export type BaseRow<T extends BaseEntity, K extends keyof T = never> = Omit<T, 'created_at' | 'updated_at' | K> & {
  created_at: Date
  updated_at: Date
}

export function mapRowToType<T extends BaseEntity, K extends keyof T = never>(row: BaseRow<T, K>): T {
  return {
    ...row,
    updated_at: Temporal.Instant.from(row.updated_at.toISOString()),
    created_at: Temporal.Instant.from(row.created_at.toISOString()),
  } as T
}

export function mapRowToTypeOptional<T extends BaseEntity>(row: BaseRow<T> | undefined): T | undefined {
  if (!row) return undefined
  return {
    ...row,
    updated_at: Temporal.Instant.from(row.updated_at.toISOString()),
    created_at: Temporal.Instant.from(row.created_at.toISOString()),
  } as T
}

export interface CountResult {
  count: string
}

export function countResultToNumber(result: QueryResult<CountResult>): number {
  return parseInt(result.rows[0].count, 10)
}
