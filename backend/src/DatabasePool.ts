import { Pool, PoolClient } from 'pg'
import { migrate } from './DatabaseMigration.js'

const DatabasePool: Promise<Pool> = setup()

async function setup(): Promise<Pool> {
  console.debug('Setting up database connection...')
  const connectionString = process.env.DB_CONNECTION_STRING
  if (!connectionString) throw new Error('Missing required database configuration: DB_CONNECTION_STRING must be defined')
  const pool = new Pool({ connectionString })
  await testConnection(pool)
  await migrate(pool)
  console.log('Connected to database')
  return pool
}

async function testConnection(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    const res = await client.query<{ result: number }>('SELECT 1 + 1 as result;')
    if (res.rows[0].result !== 2) {
      throw new Error('Database connection test failed')
    }
  }
  finally {
    client.release()
  }
}

export async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>, pool?: Pool): Promise<T> {
  const poolToBeUsed = pool ?? await DatabasePool
  const client = await poolToBeUsed.connect()
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
