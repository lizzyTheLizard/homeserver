import { Pool, PoolClient } from 'pg'
import { config } from './config'

const pool = new Pool({ connectionString: config.DB_CONNECTION_STRING, max: 100 })

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
