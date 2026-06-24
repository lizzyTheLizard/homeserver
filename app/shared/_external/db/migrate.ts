import { Pool, PoolClient } from 'pg'
import { logger } from '../../logger'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import { databaseError } from '../../_helper/BackendError'
import { splitSql } from './splitSql'

/**
 * Migrate the DB to the latest version. This function should be called through setup only.
 * @param pool The DB connection pool
 * @param upToIncluding If specified, only run migrations up to and including the given migration name. This is used for the prodToDev script to only run the migrations that have already been run in production.
 */
export async function migrateDatabase(pool: Pool, upToIncluding?: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    logger.debug('Starting Database Migrations')
    const planned = await getAllPlannedMigrations()
    const existing = await getAllExistingMigrations(client)
    logger.debug(`Found ${existing.length.toString()} existing and ${planned.length.toString()} planned migrations`)
    validateExistingMigrations(existing, planned)
    await executeNewMigrations(client, existing, planned, upToIncluding)
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
  return result.rows
}

async function getAllPlannedMigrations(): Promise<PlannedDatabaseMigration[]> {
  const migrationsDir = './db'
  const names = (await fs.readdir(migrationsDir))
    .filter(n => n.endsWith('.sql'))
    .sort()
  const result: PlannedDatabaseMigration[] = []
  for (const name of names) {
    const content = (await fs.readFile(`${migrationsDir}/${name}`, 'utf-8')).replaceAll(/\r\n/g, '\n')
    const hash = createHash('sha256').update(content).digest('hex')
    result.push({ content, hash, name, tmp: name.startsWith('XXX_') })
  }
  return result
}

async function runMigration(client: PoolClient, migration: PlannedDatabaseMigration) {
  for (const command of splitSql(migration.content)) {
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

async function executeNewMigrations(client: PoolClient, existing: DatabaseMigration[], planned: PlannedDatabaseMigration[], upToIncluding?: string) {
  // Execute the new migrations
  let lastMigrationToRun: string | undefined = undefined
  for (const p of planned) {
    const e = existing.find(m => m.name === p.name)
    if (e && lastMigrationToRun) throw databaseError(`Migration ${p.name} has already run, but migration ${lastMigrationToRun} not. The order is not correct, aborting!`)
    if (e) {
      if (p.name === upToIncluding) break
      continue
    }
    await runMigration(client, p)
    lastMigrationToRun = p.name
    if (p.name === upToIncluding) break
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
