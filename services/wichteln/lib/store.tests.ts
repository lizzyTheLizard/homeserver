import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Queryable } from './db'
import { applyMigrations } from './migrate'
import * as store from './store'
import { selectableWishOwners } from './matching'
import { hashPassword } from './password'

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
    const created = await store.createGroup(queryable, 'Team')
    if (!created.ok) throw new Error(created.error)
    for (const name of names) {
      await register(created.value.id, name)
    }
    const group = await store.getGroup(queryable, created.value.id)
    if (!group) throw new Error('Group disappeared')
    return group
  }

  async function register(groupId: string, name: string, password = `${name}-password`) {
    const result = await store.registerParticipant(queryable, groupId, name, await hashPassword(password))
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

  test('creates a group with an invite token and no participants', async () => {
    const result = await store.createGroup(queryable, 'Team')
    if (!result.ok) throw new Error(result.error)

    expect(result.value.phase).toBe('wishes')
    expect(result.value.users).toEqual([])
    expect(result.value.inviteToken).toMatch(/^team-[a-z2-9]{10}$/)
    expect(await store.listGroups(queryable)).toHaveLength(1)

    const other = await store.createGroup(queryable, 'Other')
    if (!other.ok) throw new Error(other.error)
    expect(other.value.inviteToken).not.toBe(result.value.inviteToken)
  })

  test('rejects a group without a name', async () => {
    expect(await store.createGroup(queryable, '')).toEqual({ ok: false, error: 'Bitte einen Gruppennamen eingeben.' })
    expect(await store.listGroups(queryable)).toHaveLength(0)
  })

  test('finds a group by its invite token', async () => {
    const group = await createTestGroup()

    const found = await store.getGroupByInviteToken(queryable, group.inviteToken)
    expect(found?.id).toBe(group.id)
    expect(found?.users).toHaveLength(3)
    expect(await store.getGroupByInviteToken(queryable, 'unknown')).toBeNull()
    expect(await store.getGroupByInviteToken(queryable, '')).toBeNull()
  })

  test('registers participants with names unique per group, ignoring case', async () => {
    const group = await createTestGroup(['Anna'])

    const duplicate = await store.registerParticipant(queryable, group.id, 'ANNA', await hashPassword('whatever1'))
    expect(duplicate).toEqual({ ok: false, error: 'Dieser Name ist in der Gruppe bereits vergeben.' })

    const other = await createTestGroup([])
    expect((await register(other.id, 'Anna')).name).toBe('Anna')

    expect((await store.getGroup(queryable, group.id))?.users).toHaveLength(1)
    expect((await store.getGroup(queryable, other.id))?.users).toHaveLength(1)
  })

  test('refuses registration once the selection phase has started', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    await addWishes(group)
    expect((await store.startSelection(queryable, group.id)).ok).toBe(true)

    const late = await store.registerParticipant(queryable, group.id, 'Dora', await hashPassword('whatever1'))
    expect(late.ok).toBe(false)
  })

  test('removes participants during the wish phase', async () => {
    const group = await createTestGroup()
    const dora = await register(group.id, 'Dora')

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

  test('authenticates a participant only within their group', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    const other = await createTestGroup(['Cara'])

    const found = await store.authenticateParticipant(queryable, group.id, 'ANNA', 'Anna-password')
    expect(found?.user.name).toBe('Anna')
    expect(found?.group.id).toBe(group.id)
    expect(await store.authenticateParticipant(queryable, group.id, 'Anna', 'wrong')).toBeNull()
    expect(await store.authenticateParticipant(queryable, group.id, 'Nobody', 'Anna-password')).toBeNull()
    expect(await store.authenticateParticipant(queryable, other.id, 'Anna', 'Anna-password')).toBeNull()
  })

  test('stores only password hashes', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    await register(group.id, 'Cara', 'same-password')
    await register(group.id, 'Dora', 'same-password')

    const rows = await queryable.query<{ name: string, password_hash: string }>(
      'SELECT name, password_hash FROM wichteln_users WHERE group_id = $1',
      [group.id],
    )
    const hashes = rows.map(row => row.password_hash)
    expect(hashes.every(hash => hash.startsWith('scrypt$'))).toBe(true)
    expect(hashes).not.toContain('same-password')
    expect(new Set(hashes).size).toBe(rows.length)
  })

  test('resets a password to a generated one', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    const anna = group.users.find(user => user.name === 'Anna')
    if (!anna) throw new Error('Anna is missing')

    const reset = await store.resetPassword(queryable, group.id, anna.id)
    if (!reset.ok) throw new Error(reset.error)

    expect(reset.value).toMatch(/^[a-zA-Z2-9]{10}$/)
    expect(await store.authenticateParticipant(queryable, group.id, 'Anna', 'Anna-password')).toBeNull()
    expect(await store.authenticateParticipant(queryable, group.id, 'Anna', reset.value)).not.toBeNull()

    const rows = await queryable.query<{ password_hash: string }>('SELECT password_hash FROM wichteln_users WHERE id = $1', [anna.id])
    expect(rows[0]?.password_hash).not.toBe(reset.value)

    const other = await createTestGroup(['Cara'])
    expect((await store.resetPassword(queryable, other.id, anna.id)).ok).toBe(false)
  })

  test('deletes a group with its participants', async () => {
    const group = await createTestGroup()

    await store.deleteGroup(queryable, group.id)

    expect(await store.getGroup(queryable, group.id)).toBeNull()
    expect(await store.listGroups(queryable)).toHaveLength(0)
  })
})
