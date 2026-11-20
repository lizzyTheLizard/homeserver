import { Pool, PoolClient } from 'pg'
import { config } from './config'
import { runMigrations } from './migrate'

const pool = new Pool({ connectionString: config.DB_CONNECTION_STRING, max: 100 })

/**
 * Applies the assistant's database migrations. Called once on startup before
 * the server begins serving requests.
 */
export async function initializeDatabase(): Promise<void> {
  await runMigrations(pool)
}

/**
 * Executes a function within a transaction. In case of error, the transaction is rolled back.
 * @param fn The function to execute
 * @returns The result of the function
 */
export async function transactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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
