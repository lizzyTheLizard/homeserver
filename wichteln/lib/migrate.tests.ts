import { randomUUID } from 'crypto'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, test } from 'vitest'
import type { Queryable } from './db'
import { applyMigrations } from './migrate'

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
      expect.arrayContaining(['migrations', 'wichteln_groups', 'wichteln_users']),
    )

    const applied = await queryable.query<{ name: string }>('SELECT name FROM migrations')
    expect(applied).toEqual([{ name: '001_init.sql' }])
  })

  test('does not apply a migration twice', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)

    await applyMigrations(queryable)
    await applyMigrations(queryable)

    const applied = await queryable.query<{ name: string }>('SELECT name FROM migrations')
    expect(applied).toHaveLength(1)
  })

  test('enforces unique participant names per group, ignoring case', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name) VALUES ($1, $2)', [groupId, 'Group'])
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'secret'],
    )

    await expect(queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'anna', 'secret'],
    )).rejects.toThrow()
  })

  test('requires a wish title and description together', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name) VALUES ($1, $2)', [groupId, 'Group'])

    await expect(queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password, wish_title) VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), groupId, 'Anna', 'secret', 'A title without a description'],
    )).rejects.toThrow()
  })

  test('deletes participants with their group', async () => {
    db = new PGlite()
    const queryable = pgliteQueryable(db)
    await applyMigrations(queryable)

    const groupId = randomUUID()
    await queryable.query('INSERT INTO wichteln_groups (id, name) VALUES ($1, $2)', [groupId, 'Group'])
    await queryable.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, 'Anna', 'secret'],
    )

    await queryable.query('DELETE FROM wichteln_groups WHERE id = $1', [groupId])

    const users = await queryable.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM wichteln_users')
    expect(users).toEqual([{ count: '0' }])
  })
})
