import { createHash, randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, test } from 'vitest'
import type { Queryable } from './db'
import { applyMigrations } from './migrate'
import { splitSql } from './splitSql'

function pgliteQueryable(db: PGlite): Queryable {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = await db.query<T>(sql, params)
      return result.rows
    },
  }
}

describe('database migrations', () => {
  let db: PGlite | undefined

  afterEach(async () => {
    await db?.close()
    db = undefined
  })

  test('applies the schema and records the migration', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)

    await applyMigrations(queryable)

    const tables = await queryable.query<{ table_name: string }>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name',
    )
    expect(tables.map(row => row.table_name)).toEqual(
      expect.arrayContaining(['wichteln_migrations', 'wichteln_groups', 'wichteln_users']),
    )

    const applied = await queryable.query<{ name: string }>('SELECT name FROM wichteln_migrations')
    expect(applied.map(row => row.name)).toEqual(['001_init.sql', '002_invite_registration.sql'])
  })

  test('does not apply a migration twice', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)

    await applyMigrations(queryable)
    await applyMigrations(queryable)

    const applied = await queryable.query<{ name: string }>('SELECT name FROM wichteln_migrations')
    expect(applied).toHaveLength(2)
  })

  test('enforces unique participant names per group, ignoring case', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name, invite_token) VALUES ($1, $2, $3)', [groupId, 'Group', 'token'])
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password_hash) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'secret'],
    )

    await expect(queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password_hash) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'anna', 'secret'],
    )).rejects.toThrow()
  })

  test('requires a wish title and description together', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name, invite_token) VALUES ($1, $2, $3)', [groupId, 'Group', 'token'])

    await expect(queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password_hash, wish_title) VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), groupId, 'Anna', 'secret', 'A title without a description'],
    )).rejects.toThrow()
  })

  test('deletes participants with their group', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name, invite_token) VALUES ($1, $2, $3)', [groupId, 'Group', 'token'])
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password_hash) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'secret'],
    )

    await queryable.query('DELETE FROM wichteln_groups WHERE id = $1', [groupId])

    const users = await queryable.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM wichteln_users')
    expect(users).toEqual([{ count: '0' }])
  })
  test('enforces unique invite tokens', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    await queryable.query('INSERT INTO wichteln_groups (id, name, invite_token) VALUES ($1, $2, $3)', [randomUUID(), 'One', 'same'])

    await expect(queryable.query(
      'INSERT INTO wichteln_groups (id, name, invite_token) VALUES ($1, $2, $3)',
      [randomUUID(), 'Two', 'same'],
    )).rejects.toThrow()
  })

  test('drops existing groups when upgrading to invite registration', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyOnly(queryable, '001_init.sql')

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name) VALUES ($1, $2)', [groupId, 'Old group'])
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'plain'],
    )

    await applyMigrations(queryable)

    expect(await queryable.query('SELECT id FROM wichteln_groups')).toEqual([])
    expect(await queryable.query('SELECT id FROM wichteln_users')).toEqual([])
    const columns = await queryable.query<{ column_name: string }>(
      'SELECT column_name FROM information_schema.columns WHERE table_name = \'wichteln_users\'',
    )
    expect(columns.map(row => row.column_name)).toContain('password_hash')
    expect(columns.map(row => row.column_name)).not.toContain('password')
  })
})

/** Applies a single migration file the way `applyMigrations` would, to simulate an older database. */
async function applyOnly(db: Queryable, name: string): Promise<void> {
  const content = (await fs.readFile(path.join(process.cwd(), 'db', name), 'utf8')).replaceAll(/\r\n/g, '\n')
  await db.query('CREATE TABLE wichteln_migrations (name TEXT PRIMARY KEY, hash TEXT, run_on TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  for (const statement of splitSql(content)) {
    await db.query(statement)
  }
  await db.query(
    'INSERT INTO wichteln_migrations (name, hash) VALUES ($1, $2)',
    [name, createHash('sha256').update(content).digest('hex')],
  )
}
