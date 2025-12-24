import { Pool, PoolClient } from 'pg'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import { dirname } from 'path'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@/logger'

export async function transactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return inTransaction(await getPool(), fn)
}

let pool: Promise<Pool> | undefined = undefined
async function getPool(): Promise<Pool> {
  pool ??= setupPool()
  return pool
}

async function setupPool(): Promise<Pool> {
  logger.debug('Setting up database connection')
  const pool = new Pool({ connectionString: process.env.DB_CONNECTION_STRING })
  await testConnection(pool)
  await inTransaction(pool, async (client) => {
    logger.debug('Starting Database Migrations')
    const planned = await getAllPlannedMigrations()
    const existing = await getAllExistingMigrations(client)
    validateExistingMigrations(existing, planned)
    await executeNewMigrations(client, existing, planned)
  })
  logger.info('Database successfully connected and migrations complete')
  return pool
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

async function getAllExistingMigrations(client: PoolClient): Promise<DatabaseMigration[]> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY, 
      hash TEXT, 
      run_on TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
  const result = await client.query<DatabaseMigration>(`SELECT name, hash, run_on FROM migrations;`)
  logger.debug(`Found ${result.rows.length.toString()} existing migrations`)
  return result.rows
}

async function getAllPlannedMigrations(): Promise<PlannedDatabaseMigration[]> {
  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  const migrationsDir = path.resolve(currentDir, '../../../db')
  const names = await fs.readdir(migrationsDir)
  const result: PlannedDatabaseMigration[] = []
  for (const name of names) {
    const content = (await fs.readFile(`${migrationsDir}/${name}`, 'utf-8')).replaceAll(/\r\n/g, '\n')
    const hash = createHash('sha256').update(content).digest('hex')
    result.push({ content, hash, name })
  }
  logger.debug(`Found ${result.length.toString()} planned migrations`)
  return result
}

async function runMigration(client: PoolClient, migration: PlannedDatabaseMigration) {
  const commands = migration.content.split(';').map(c => c.trim()).filter(c => c.length > 0)
  for (const command of commands) {
    await client.query(command)
  }
  await client.query(`INSERT INTO migrations (name, hash) VALUES ($1, $2)`, [migration.name, migration.hash])
  logger.info(`Migration ${migration.name} executed successfully`)
}

function validateExistingMigrations(existing: DatabaseMigration[], planned: PlannedDatabaseMigration[]) {
  // Check if there is a problem with the existing migrations
  for (const e of existing) {
    const p = planned.find(m => m.name === e.name)
    if (!p) throw new Error(`Migration ${e.name} has been executed but the file does not exist any more, aborting!`)
    if (p.hash !== e.hash) throw new Error(`Migration ${e.name} has been executed but the file has changed, aborting!`)
  }
}

async function executeNewMigrations(client: PoolClient, existing: DatabaseMigration[], planned: PlannedDatabaseMigration[]) {
  // Execute the new migrations
  let lastMigrationToRun: string | undefined = undefined
  for (const p of planned) {
    const e = existing.find(m => m.name === p.name)
    if (e && lastMigrationToRun) throw new Error(`Migration ${p.name} has already run, but migration ${lastMigrationToRun} not. The order is not correct, aborting!`)
    if (e) {
      logger.debug(`Migration ${p.name} has already run on ${e.run_on.toISOString()}`)
      continue
    }
    await runMigration(client, p)
    lastMigrationToRun = p.name
  }
}

interface DatabaseMigration {
  name: string
  hash: string
  run_on: Date
}

interface PlannedDatabaseMigration {
  name: string
  content: string
  hash: string
}
