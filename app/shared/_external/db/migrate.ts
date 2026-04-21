import { Pool, PoolClient } from 'pg'
import { logger } from '../../logger'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import { databaseError } from '../../_helper/BackendError'

/**
 * Migrate the DB to the latest version. This function should be called through setup only.
 * @param pool The DB connection pool
 */
export async function migrateDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    logger.debug('Starting Database Migrations')
    const planned = await getAllPlannedMigrations()
    const existing = await getAllExistingMigrations(client)
    validateExistingMigrations(existing, planned)
    await executeNewMigrations(client, existing, planned)
    await client.query('COMMIT')
  }
  catch (error) {
    await client.query('ROLLBACK')
    logger.warn('Database migration failed', error)
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
  const migrationsDir = getMigrationDir()
  const names = await fs.readdir(migrationsDir)
  const result: PlannedDatabaseMigration[] = []
  for (const name of names) {
    const content = (await fs.readFile(`${migrationsDir}/${name}`, 'utf-8')).replaceAll(/\r\n/g, '\n')
    const hash = createHash('sha256').update(content).digest('hex')
    result.push({ content, hash, name, tmp: name.startsWith('XXX_') })
  }
  logger.debug(`Found ${result.length.toString()} planned migrations`)
  return result
}

function getMigrationDir(): string {
  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(currentDir, '../../../../db')
  }
  return path.resolve(currentDir, '../../../../../db')
}

async function runMigration(client: PoolClient, migration: PlannedDatabaseMigration) {
  const commands = migration.content.split(';').map(c => c.trim()).filter(c => c.length > 0)
  for (const command of commands) {
    await client.query(command)
  }
  if (migration.tmp) {
    logger.warn(`Tmp migration ${migration.name} executed successfully and NOT saved to the database. Do NOT do this in production, but remove the XXX_ prefix!`)
  }
  else {
    await client.query(`INSERT INTO migrations (name, hash) VALUES ($1, $2)`, [migration.name, migration.hash])
    logger.debug(`Migration ${migration.name} executed successfully`)
  }
}

function validateExistingMigrations(existing: DatabaseMigration[], planned: PlannedDatabaseMigration[]) {
  // Check if there is a problem with the existing migrations
  for (const e of existing) {
    const p = planned.find(m => m.name === e.name)
    if (!p) throw databaseError(`Migration ${e.name} has been executed but the file does not exist any more, aborting!`)
    if (p.hash !== e.hash) throw databaseError(`Migration ${e.name} has been executed but the file has changed, aborting!`)
  }
}

async function executeNewMigrations(client: PoolClient, existing: DatabaseMigration[], planned: PlannedDatabaseMigration[]) {
  // Execute the new migrations
  let lastMigrationToRun: string | undefined = undefined
  for (const p of planned) {
    const e = existing.find(m => m.name === p.name)
    if (e && lastMigrationToRun) throw databaseError(`Migration ${p.name} has already run, but migration ${lastMigrationToRun} not. The order is not correct, aborting!`)
    if (e) {
      logger.debug(`Migration ${p.name} has already run on ${e.run_on}`)
      continue
    }
    await runMigration(client, p)
    lastMigrationToRun = p.name
  }
}

interface DatabaseMigration {
  name: string
  hash: string
  run_on: string
}

interface PlannedDatabaseMigration {
  name: string
  content: string
  hash: string
  tmp: boolean
}
