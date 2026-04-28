import PG, { Pool } from 'pg'
import { logger } from '../../logger'
import { config } from '../../config'
import { databaseError, isBackendError } from '../../_helper/BackendError'
import { migrateDatabase } from './migrate'

export const TYPE_MAPPINGS: Record<number, (value: string) => unknown> = {
  1082: value => value, // DATE
  1114: value => value, // TIMESTAMP WITHOUT TIME ZONE
  1184: value => value, // TIMESTAMP WITH TIME ZONE
  21: value => parseInt(value, 10), // INT2
  23: value => parseInt(value, 10), // INT4
  20: value => parseInt(value, 10), // INT8
  1700: value => parseFloat(value), // NUMERIC
}

/**
 * Setup the Postgres connection pool, test the connection and run migrations. This function should
 * be called once on server start.
 * @returns The Postgres connection pool
 */
export async function setupPool(): Promise<Pool> {
  try {
    logger.debug('Setting up database connection')
    const pool = new Pool({ connectionString: config.DB_CONNECTION_STRING })
    Object.entries(TYPE_MAPPINGS).forEach(([typeId, parser]) => { PG.types.setTypeParser(parseInt(typeId, 10), parser) })
    await testConnection(pool)
    await migrateDatabase(pool)
    logger.info('Database successfully connected and migrated')
    return pool
  }
  catch (error) {
    logger.error('Failed to set up database connection:', isBackendError(error) && !error.showStack ? error.message : error)
    throw error
  }
}

async function testConnection(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    const res = await client.query<{ result: number }>('SELECT 1 + 1 as result;')
    if (res.rows[0]?.result !== 2) {
      throw databaseError('Database connection test failed')
    }
  }
  finally {
    client.release()
  }
}
