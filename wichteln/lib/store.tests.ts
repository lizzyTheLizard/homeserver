import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Queryable } from './db'
import { applyMigrations } from './migrate'
import * as store from './store'
import { selectableWishOwners } from './matching'

function pgliteQueryable(db: PGlite): Queryable {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = await db.query<T>(sql, params)
      return result.rows
    },
  }
}

describe('store', () => {
  let db: PGlite | undefined
  let queryable: Queryable

  beforeEach(async () => {
    db = new PGlite()
    queryable = pgliteQueryable(db)
    await applyMigrations(queryable)
  })

  afterEach(async () => {
    await db?.close()
    db = undefined
  })

  async function createTestGroup(names = ['Anna', 'Ben', 'Cara']) {
    const result = await store.createGroup(queryable, 'Team', names)
    if (!result.ok) throw new Error(result.error)
    return result.value
  }

  async function addWishes(group: store.Group) {
    for (const user of group.users) {
      const result = await store.saveWish(queryable, group.id, user.id, {
        title: `Wish ${user.name}`,
        description: `Description ${user.name}`,
      })
      if (!result.ok) throw new Error(result.error)
    }
  }

  test('creates a group with generated, unique passwords', async () => {
    const group = await createTestGroup()

    expect(group.phase).toBe('wishes')
    expect(group.users.map(user => user.name)).toEqual(expect.arrayContaining(['Anna', 'Ben', 'Cara']))
    expect(new Set(group.users.map(user => user.password)).size).toBe(3)
    expect(await store.listGroups(queryable)).toHaveLength(1)
  })

  test('rejects duplicate and too few participant names', async () => {
    const duplicate = await store.createGroup(queryable, 'Team', ['Anna', 'anna'])
    expect(duplicate).toEqual({ ok: false, error: 'Der Name „anna“ kommt mehrfach vor.' })

    const tooFew = await store.createGroup(queryable, 'Team', ['Anna'])
    expect(tooFew.ok).toBe(false)
  })

  test('adds and removes participants during the wish phase', async () => {
    const group = await createTestGroup()

    expect(await store.addParticipants(queryable, group.id, ['Dora'])).toEqual({ ok: true, value: 1 })
    expect((await store.addParticipants(queryable, group.id, ['dora'])).ok).toBe(false)

    const withDora = await store.getGroup(queryable, group.id)
    const dora = withDora?.users.find(user => user.name === 'Dora')
    if (!dora) throw new Error('Dora was not added')

    await store.removeParticipant(queryable, group.id, dora.id)
    const withoutDora = await store.getGroup(queryable, group.id)
    expect(withoutDora?.users.map(user => user.name)).not.toContain('Dora')
  })

  test('collects wishes and only then starts the selection phase', async () => {
    const group = await createTestGroup()

    expect((await store.startSelection(queryable, group.id)).ok).toBe(false)
    await addWishes(group)
    expect((await store.startSelection(queryable, group.id)).ok).toBe(true)

    const updated = await store.getGroup(queryable, group.id)
    expect(updated?.phase).toBe('selection')

    const first = group.users.at(0)
    if (!first) throw new Error('Group has no participants')
    expect((await store.saveWish(queryable, group.id, first.id, { title: 'Late', description: 'Too late' })).ok).toBe(false)
  })

  test('never assigns the same wish twice and leaves everyone with a foreign wish', async () => {
    const group = await createTestGroup()
    await addWishes(group)
    await store.startSelection(queryable, group.id)

    const first = group.users.at(0)
    const second = group.users.at(1)
    if (!first || !second) throw new Error('Group has too few participants')

    let current = await store.getGroup(queryable, group.id)
    if (!current) throw new Error('Group disappeared')
    const firstPick = selectableWishOwners(current, first.id)[0]
    if (!firstPick) throw new Error('First participant has nothing to select')
    expect((await store.selectWish(queryable, group.id, first.id, firstPick)).ok).toBe(true)

    expect((await store.selectWish(queryable, group.id, second.id, firstPick)).ok).toBe(false)

    for (const user of group.users) {
      current = await store.getGroup(queryable, group.id)
      if (!current) throw new Error('Group disappeared')
      const currentUser = current.users.find(candidate => candidate.id === user.id)
      if (currentUser?.selectedWishOf) continue

      const pick = selectableWishOwners(current, user.id)[0]
      if (!pick) throw new Error(`${user.name} has nothing to select`)
      expect((await store.selectWish(queryable, group.id, user.id, pick)).ok).toBe(true)
    }

    const final = await store.getGroup(queryable, group.id)
    if (!final) throw new Error('Group disappeared')
    for (const user of final.users) {
      expect(user.selectedWishOf).not.toBeNull()
      expect(user.selectedWishOf).not.toBe(user.id)
    }
    expect(new Set(final.users.map(user => user.selectedWishOf)).size).toBe(final.users.length)
  })

  test('authenticates a participant by name and password', async () => {
    const group = await createTestGroup()
    const user = group.users.at(0)
    if (!user) throw new Error('Group has no participants')

    expect(await store.authenticateParticipant(queryable, user.name.toUpperCase(), user.password)).not.toBeNull()
    expect(await store.authenticateParticipant(queryable, user.name, 'wrong')).toBeNull()
  })

  test('deletes a group with its participants', async () => {
    const group = await createTestGroup()

    await store.deleteGroup(queryable, group.id)

    expect(await store.getGroup(queryable, group.id)).toBeNull()
    expect(await store.listGroups(queryable)).toHaveLength(0)
  })
})
