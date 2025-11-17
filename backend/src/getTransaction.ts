import createConnectionPool, { ConnectionPool, sql, Transaction } from '@databases/pg'
import mig from '@databases/pg-migrations'

const poolPromise: Promise<ConnectionPool> = setup()

async function setup() {
  console.debug('Setting up database connection...')
  const connectionString = process.env.DB_CONNECTION_STRING
  if (!connectionString) throw new Error('Missing required database configuration: DB_CONNECTION_STRING must be defined')
  const pool = createConnectionPool({ connectionString, bigIntMode: 'bigint' })
  await testConnection(pool)
  await migrate(pool)
  console.log('Connectied to database')
  return pool
}

async function testConnection(pool: ConnectionPool): Promise<void> {
  const results = await pool.query(sql`SELECT 1 + 1 as result;`) as { result: number }[]
  if (results[0].result !== 2) {
    throw new Error('Database connection test failed')
  }
}

async function migrate(pool: ConnectionPool): Promise<void> {
  console.debug('Applying database migrations...')
  await mig.applyMigrations({ connection: pool, migrationsDirectory: 'db' })
  console.debug('Database migrations applied')
}

export async function getTransaction<T>(fn: (connection: Transaction) => Promise<T>): Promise<T> {
  const pool = await poolPromise
  return pool.tx(async tx => fn(tx))
}
