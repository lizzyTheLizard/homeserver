import { PoolClient } from 'pg'
import { setupPool } from './setup'

const poolPromise = setupPool()

/**
 * Executes a function without a transaction. No rollback is possible.
 * @param fn The function to execute
 * @returns The result of the function
 */
export async function nontransactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await poolPromise
  const client = await pool.connect()
  try {
    const result = await fn(client)
    return result
  }
  finally {
    client.release()
  }
}

/**
 * Executes a function within a transaction. In case of error, the transaction is rolled back.
 * @param fn The function to execute
 * @returns The result of the function
 */
export async function transactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await poolPromise
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  }
  catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
  finally {
    client.release()
  }
}

/**
 * Add common fields to an entity.
 */
export type Entity<T> = T & {
  created_at: string
  updated_at: string
  owner_id: string
}

/**
 * PG returns js 'null' for null DB values. This function
 * replaces all nulls with undefined, recursively.
 * @param input The initial object (might be null itself)
 * @returns The input with all nulls replaced with undefined
 */
export const removeNull = <T>(input: T): T => {
  if (input === null)
    return undefined as T
  if (Array.isArray(input)) {
    // Process each array element recursively
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return input.map(item => removeNull(item)) as T
  }
  if (typeof input === 'object') {
    // Process object entries recursively
    return Object.entries(input).reduce((acc, [key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (acc as any)[key] = removeNull(value)
      return acc
    }, {}) as T
  }
  // Return primitives as-is
  return input
}

/**
 * Execute a COUNT query and return the number as number.
 * @param client The DB client
 * @param query The query to execute
 * @param params The query parameters
 * @returns The count as number
 */
export async function count(client: PoolClient, query: string, params?: unknown[]): Promise<number> {
  const result = await client.query<{ count: string }>(query, params)
  return parseInt(result.rows[0].count, 10)
}
