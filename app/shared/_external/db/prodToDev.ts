import { migrateDatabase } from './migrate.js'
import PG, { Pool } from 'pg'
import { TYPE_MAPPINGS } from './setup.js'
import { pipeline } from 'node:stream/promises'
import { from, to } from 'pg-copy-streams'
import { logger } from '../../logger'

async function main() {
  if (!process.env.DB_CONNECTION_STRING)
    throw new Error('Missing required environment variable: DB_CONNECTION_STRING')
  if (!process.env.DB_CONNECTION_STRING_PROD)
    throw new Error('Missing required environment variable: DB_CONNECTION_STRING_PROD')
  if (process.env.DB_CONNECTION_STRING_PROD === process.env.DB_CONNECTION_STRING)
    throw new Error('DB_CONNECTION_STRING_PROD cannot be the same as the current DB_CONNECTION_STRING')

  const testPool = setupPool(process.env.DB_CONNECTION_STRING)
  await deleteAllData(testPool)
  const prodPool = setupPool(process.env.DB_CONNECTION_STRING_PROD)
  await migrateUpToProd(testPool, prodPool)
  await copyAllData(prodPool, testPool)
  await migrateRemaining(testPool)
  logger.info('Done - the test database should now be in the same state as the production database, but with the latest migrations applied')
}

function setupPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString: connectionString })
  Object.entries(TYPE_MAPPINGS).forEach(([typeId, parser]) => { PG.types.setTypeParser(parseInt(typeId, 10), parser) })
  return pool
}

async function deleteAllData(pool: Pool): Promise<void> {
  logger.info('Delete all existing data in the test database')
  const client = await pool.connect()
  try {
    const tables = await getAllTableNames(pool)
    for (const table of tables) {
      logger.debug(`Delete table ${table}...`)
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`)
    }
  }
  finally {
    client.release()
  }
}

async function migrateUpToProd(testPool: Pool, prodPool: Pool): Promise<void> {
  const client = await prodPool.connect()
  let lastMigration: string | undefined
  try {
    const result = await client.query<{ name: string }>('SELECT name FROM migrations ORDER BY run_on DESC LIMIT 1')
    lastMigration = result.rows.length > 0 ? result.rows[0].name : undefined
  }
  finally {
    client.release()
  }
  logger.info(`Migrate the test database to the last migration of the production database: ${lastMigration ?? 'none'}`)
  await migrateDatabase(testPool, lastMigration)
}

async function copyAllData(fromPool: Pool, toPool: Pool): Promise<void> {
  logger.info('Copy all data from the production database to the test database')
  const fromClient = await fromPool.connect()
  const toClient = await toPool.connect()
  try {
    const tables = await getAllTableNames(fromPool)
    for (const table of tables) {
      if (table === 'migrations') continue
      logger.debug(`Copying table ${table}...`)
      const exportStream = fromClient.query(to(`COPY ${table} TO STDOUT`))
      const importStream = toClient.query(from(`COPY ${table} FROM STDIN`))
      await pipeline(exportStream, importStream)
    }
  }
  finally {
    fromClient.release()
    toClient.release()
  }
}

async function migrateRemaining(pool: Pool): Promise<void> {
  logger.info('Migrate the test database to the latest version (in case there are migrations that have not been run in production yet)')
  await migrateDatabase(pool)
}

async function getAllTableNames(pool: Pool): Promise<string[]> {
  const client = await pool.connect()
  try {
    const tablesResult = await client.query<{ table_name: string }>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = $2',
      ['public', 'BASE TABLE'],
    )
    return tablesResult.rows.map(row => row.table_name)
  }
  finally {
    client.release()
  }
}

main().catch((error: unknown) => {
  console.error('[prodToDev] Failed:', error)
  process.exitCode = 1
})
