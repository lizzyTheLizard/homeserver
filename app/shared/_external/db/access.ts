import { Pool, PoolClient } from 'pg'
import { setupPool } from './setup'

export async function nontransactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await getPool()
  const client = await pool.connect()
  try {
    const result = await fn(client)
    return result
  }
  finally {
    client.release()
  }
}

export async function transactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return inTransaction(await getPool(), fn)
}

let pool: Promise<Pool> | undefined = undefined
async function getPool(): Promise<Pool> {
  pool ??= setupPool(inTransaction)
  return pool
}

async function inTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
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
