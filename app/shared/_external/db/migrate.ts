import { Pool, PoolClient } from 'pg'
import { logger } from '../../logger'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import { databaseError } from '../../_helper/BackendError'

export async function migrateDatabase(pool: Pool, inTransaction: (pool: Pool, fn: (client: PoolClient) => Promise<unknown>) => Promise<unknown>): Promise<void> {
  await inTransaction(pool, async (client) => {
    logger.debug('Starting Database Migrations')
    const planned = await getAllPlannedMigrations()
    const existing = await getAllExistingMigrations(client)
    validateExistingMigrations(existing, planned)
    await executeNewMigrations(client, existing, planned)
  })
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
  const migrationsDir = path.resolve(currentDir, '../../../../../db')
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
}
