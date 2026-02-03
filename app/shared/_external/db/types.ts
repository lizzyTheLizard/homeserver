import { QueryResult } from 'pg'

export interface BaseEntity {
  created_at: string
  updated_at: string
  owner_id: string
}

export type BaseInput<T extends BaseEntity> = Omit<T, 'created_at' | 'updated_at' | 'owner_id'>

export interface CountResult {
  count: string
}

export function countResultToNumber(result: QueryResult<CountResult>): number {
  return parseInt(result.rows[0].count, 10)
}

export const removeNull = <T>(obj: T): T => {
  if (obj === null || obj === undefined)
    return undefined as unknown as T
  if (Array.isArray(obj)) {
    // Process each array element recursively
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return obj.map(item => removeNull(item)) as T
  }
  if (typeof obj === 'object') {
    // Process object entries recursively
    return Object.entries(obj).reduce((acc, [key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (acc as any)[key] = removeNull(value)
      return acc
    }, {}) as T
  }
  // Return other primitives as-is
  return obj
}
