import { Pool, PoolClient } from 'pg'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import { inTransaction } from './DatabasePool.js'
import { dirname } from 'path'
import path from 'path'
import { fileURLToPath } from 'url'

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

export async function migrate(pool: Pool): Promise<void> {
  console.log('Running database migrations...')
  const planned = await getAllPlannedMigrations()
  await inTransaction(async (client) => {
    // Check if there is a problem with the existing migrations
    const existing = await getAllExistingMigrations(client)
    for (const e of existing) {
      const p = planned.find(m => m.name === e.name)
      if (!p) throw new Error(`Migration ${e.name} has been executed but the file does not exist any more, aborting!`)
      if (p.hash !== e.hash) throw new Error(`Migration ${e.name} has been executed but the file has changed, aborting!`)
    }

    // Execute the new migrations
    let lastMigrationToRun: string | undefined = undefined
    for (const p of planned) {
      const e = existing.find(m => m.name === p.name)
      if (e && lastMigrationToRun) throw new Error(`Migration ${p.name} has already run, but migration ${lastMigrationToRun} not. The order is not correct, aborting!`)
      if (e) {
        console.debug(`Migration ${p.name} has already run on ${e.run_on.toISOString()}`)
        continue
      }
      await runMigration(client, p)
      lastMigrationToRun = p.name
    }
    console.log('All database migrations complete')
  }, pool)
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
  console.debug(`Found ${result.rowCount?.toString() ?? '0'} existing migrations`)
  return result.rows
}

async function getAllPlannedMigrations(): Promise<PlannedDatabaseMigration[]> {
  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  const migrationsDir = path.resolve(currentDir, '../db')
  const names = await fs.readdir(migrationsDir)
  const result: PlannedDatabaseMigration[] = []
  for (const name of names) {
    const content = await fs.readFile(`${migrationsDir}/${name}`, 'utf-8')
    const hash = createHash('sha256').update(content).digest('hex')
    result.push({ content, hash, name })
  }
  console.debug(`Found ${result.length.toString()} planned migrations`)
  return result
}

async function runMigration(client: PoolClient, migration: PlannedDatabaseMigration) {
  console.debug(`Running migration ${migration.name}`)
  await client.query(migration.content)
  await client.query(`INSERT INTO migrations (name, hash) VALUES ($1, $2)`, [migration.name, migration.hash])
  console.log(`Migration ${migration.name} complete`)
}
