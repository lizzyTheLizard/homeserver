import { Pool, type PoolClient } from 'pg'
import { migrateDatabase } from './migrateDatabase.js'
import type { DatabaseHandle } from './Context.js'
import { Config } from './Config.js'

export async function getDatabaseHandle(): Promise<DatabaseHandle> {
  console.debug('Setting up database connection...')
  const pool = new Pool({ connectionString: Config.dbConnectionString })
  await testConnection(pool)
  await migrateDatabase(pool)
  console.log('Connected to database')
  return {
    inTransaction: async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
      return inTransaction(fn, pool)
    },
  }
}

async function testConnection(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    const res = await client.query<{ result: number }>('SELECT 1 + 1 as result;')
    if (res.rows[0]?.result !== 2) {
      throw new Error('Database connection test failed')
    }
  }
  finally {
    client.release()
  }
}

async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>, pool: Pool): Promise<T> {
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
