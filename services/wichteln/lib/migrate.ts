import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import type { Queryable } from './db'
import { splitSql } from './splitSql'

const MIGRATIONS_DIR = path.join(process.cwd(), 'db')

/** Lock key used to serialise migrations across concurrently starting instances. */
export const MIGRATION_LOCK_ID = 8_342_119

interface PlannedMigration {
  name: string
  content: string
  hash: string
}

interface AppliedMigration {
  name: string
  hash: string | null
}

/**
 * Applies every pending migration to the given database and records it in the
 * `wichteln_migrations` table. The caller is responsible for the surrounding
 * transaction and the advisory lock.
 */
export async function applyMigrations(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS wichteln_migrations (
      name TEXT PRIMARY KEY,
      hash TEXT,
      run_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const planned = await readPlannedMigrations()
  const applied = new Map(
    (await db.query<AppliedMigration>('SELECT name, hash FROM wichteln_migrations')).map(m => [m.name, m.hash]),
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
      await db.query(statement)
    }
    await db.query('INSERT INTO wichteln_migrations (name, hash) VALUES ($1, $2)', [migration.name, migration.hash])
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
