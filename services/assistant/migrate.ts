import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { Pool, PoolClient } from 'pg'
import { splitSql } from './splitSql'

const MIGRATIONS_DIR = path.join(process.cwd(), 'db')

/** Lock key used to serialise migrations across concurrently starting instances. */
const MIGRATION_LOCK_ID = 8_342_120

interface AppliedMigration {
  name: string
  hash: string | null
}

interface PlannedMigration {
  name: string
  content: string
  hash: string
}

/**
 * Applies every pending migration to the database and records it in the
 * `migrations` table, inside a transaction guarded by an advisory lock.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID])
    await applyMigrations(client)
    await client.query('COMMIT')
  }
  catch (error) {
    try {
      await client.query('ROLLBACK')
    }
    catch {
      // Keep the original error; a failed rollback is not actionable here.
    }
    throw error
  }
  finally {
    client.release()
  }
}

async function applyMigrations(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      hash TEXT,
      run_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const planned = await readPlannedMigrations()
  const applied = new Map(
    (await client.query<AppliedMigration>('SELECT name, hash FROM migrations')).rows.map(m => [m.name, m.hash]),
  )
  let seenUnapplied = false

  for (const migration of planned) {
    const appliedHash = applied.get(migration.name)

    if (appliedHash !== undefined) {
      if (seenUnapplied) {
        throw new Error(`Migration ${migration.name} has run, but an earlier migration has not`)
      }
      if (appliedHash !== migration.hash) {
        throw new Error(`Migration ${migration.name} has changed since it was applied`)
      }
      continue
    }

    seenUnapplied = true
    for (const statement of splitSql(migration.content)) {
      await client.query(statement)
    }
    await client.query('INSERT INTO migrations (name, hash) VALUES ($1, $2)', [migration.name, migration.hash])
  }
}

async function readPlannedMigrations(): Promise<PlannedMigration[]> {
  const names = (await fs.readdir(MIGRATIONS_DIR))
    .filter(name => name.endsWith('.sql'))
    .sort()

  const migrations: PlannedMigration[] = []
  for (const name of names) {
    const content = (await fs.readFile(path.join(MIGRATIONS_DIR, name), 'utf8')).replaceAll(/\r\n/g, '\n')
    migrations.push({
      name,
      content,
      hash: createHash('sha256').update(content).digest('hex'),
    })
  }
  return migrations
}
