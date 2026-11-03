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
    const names = tables.map(row => row.table_name)
    expect(names).toEqual(
      expect.arrayContaining(['wichteln_migrations', 'wichteln_groups', 'wichteln_accounts', 'wichteln_participants']),
    )
    expect(names).not.toContain('wichteln_users')

    const applied = await queryable.query<{ name: string }>('SELECT name FROM wichteln_migrations ORDER BY name')
    expect(applied.map(row => row.name)).toEqual(['001_init.sql', '002_invite_registration.sql', '003_accounts.sql'])
  })

  test('does not apply a migration twice', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)

    await applyMigrations(queryable)
    await applyMigrations(queryable)

    const applied = await queryable.query<{ name: string }>('SELECT name FROM wichteln_migrations')
    expect(applied).toHaveLength(3)
  })

  test('enforces unique account names, ignoring case', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    await insertAccount(queryable, 'Anna')
    await expect(insertAccount(queryable, 'anna')).rejects.toThrow()
  })

  test('allows an account only once per group', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = await insertGroup(queryable, 'token')
    const accountId = await insertAccount(queryable, 'Anna')
    await insertParticipant(queryable, groupId, accountId)

    await expect(insertParticipant(queryable, groupId, accountId)).rejects.toThrow()
    await insertParticipant(queryable, await insertGroup(queryable, 'other'), accountId)
  })

  test('requires a wish title and description together', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = await insertGroup(queryable, 'token')
    const accountId = await insertAccount(queryable, 'Anna')

    await expect(queryable.query(
      'INSERT INTO wichteln_participants (id, group_id, account_id, wish_title) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, accountId, 'A title without a description'],
    )).rejects.toThrow()
  })

  test('deletes memberships with their group but keeps the accounts', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = await insertGroup(queryable, 'token')
    await insertParticipant(queryable, groupId, await insertAccount(queryable, 'Anna'))

    await queryable.query('DELETE FROM wichteln_groups WHERE id = $1', [groupId])

    expect(await queryable.query('SELECT COUNT(*)::text AS count FROM wichteln_participants')).toEqual([{ count: '0' }])
    expect(await queryable.query('SELECT COUNT(*)::text AS count FROM wichteln_accounts')).toEqual([{ count: '1' }])
  })

  test('enforces unique invite tokens', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    await insertGroup(queryable, 'same')
    await expect(insertGroup(queryable, 'same')).rejects.toThrow()
  })

  test('drops existing groups when upgrading to invite registration', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyOnly(queryable, ['001_init.sql'])

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name) VALUES ($1, $2)', [groupId, 'Old group'])
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'plain'],
    )

    await applyOnly(queryable, ['002_invite_registration.sql'])

    expect(await queryable.query('SELECT id FROM wichteln_groups')).toEqual([])
    expect(await queryable.query('SELECT id FROM wichteln_users')).toEqual([])
    const columns = await queryable.query<{ column_name: string }>(
      'SELECT column_name FROM information_schema.columns WHERE table_name = \'wichteln_users\'',
    )
    expect(columns.map(row => row.column_name)).toContain('password_hash')
    expect(columns.map(row => row.column_name)).not.toContain('password')
  })

  test('drops existing groups and participants when upgrading to accounts', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyOnly(queryable, ['001_init.sql', '002_invite_registration.sql'])

    const groupId = await insertGroup(queryable, 'token')
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password_hash) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'scrypt$hash'],
    )

    await applyMigrations(queryable)

    expect(await queryable.query('SELECT id FROM wichteln_groups')).toEqual([])
    expect(await queryable.query('SELECT id FROM wichteln_accounts')).toEqual([])
    expect(await queryable.query('SELECT id FROM wichteln_participants')).toEqual([])
    const legacy = await queryable.query(
      'SELECT table_name FROM information_schema.tables WHERE table_name = \'wichteln_users\'',
    )
    expect(legacy).toEqual([])
  })
})

async function insertGroup(db: Queryable, token: string): Promise<string> {
  const id = randomUUID()
  await db.query('INSERT INTO wichteln_groups (id, name, invite_token) VALUES ($1, $2, $3)', [id, 'Group', token])
  return id
}

async function insertAccount(db: Queryable, name: string): Promise<string> {
  const id = randomUUID()
  await db.query('INSERT INTO wichteln_accounts (id, name, password_hash) VALUES ($1, $2, $3)', [id, name, 'secret'])
  return id
}

async function insertParticipant(db: Queryable, groupId: string, accountId: string): Promise<void> {
  await db.query(
    'INSERT INTO wichteln_participants (id, group_id, account_id) VALUES ($1, $2, $3)',
    [randomUUID(), groupId, accountId],
  )
}

/** Applies the given migration files the way `applyMigrations` would, to simulate an older database. */
async function applyOnly(db: Queryable, names: string[]): Promise<void> {
  await db.query('CREATE TABLE IF NOT EXISTS wichteln_migrations (name TEXT PRIMARY KEY, hash TEXT, run_on TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  for (const name of names) {
    const content = (await fs.readFile(path.join(process.cwd(), 'db', name), 'utf8')).replaceAll(/\r\n/g, '\n')
    for (const statement of splitSql(content)) {
      await db.query(statement)
    }
    await db.query(
      'INSERT INTO wichteln_migrations (name, hash) VALUES ($1, $2)',
      [name, createHash('sha256').update(content).digest('hex')],
    )
  }
}
