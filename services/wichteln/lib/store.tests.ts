import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Queryable } from './db'
import { applyMigrations } from './migrate'
import * as store from './store'
import { selectableWishOwners } from './matching'
import { hashPassword } from './password'
import { NAME_TAKEN } from './registration'

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
    const result = await store.registerAccount(queryable, groupId, name, await hashPassword(password))
    if (!result.ok) throw new Error(result.error)
    return result.value
  }

  async function participant(groupId: string, accountId: string) {
    const found = await store.findParticipant(queryable, groupId, accountId)
    if (!found) throw new Error('Participant is missing')
    return found.user
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

  test('registers accounts with names unique across all groups, ignoring case', async () => {
    const group = await createTestGroup(['Anna'])
    const other = await createTestGroup([])

    const sameGroup = await store.registerAccount(queryable, group.id, 'ANNA', await hashPassword('whatever1'))
    expect(sameGroup).toEqual({ ok: false, error: NAME_TAKEN })
    const otherGroup = await store.registerAccount(queryable, other.id, 'anna', await hashPassword('whatever1'))
    expect(otherGroup).toEqual({ ok: false, error: NAME_TAKEN })

    expect((await store.getGroup(queryable, group.id))?.users).toHaveLength(1)
    expect((await store.getGroup(queryable, other.id))?.users).toHaveLength(0)
    expect(await queryable.query('SELECT id FROM wichteln_accounts')).toHaveLength(1)
  })

  test('lets one account take part in several groups with separate wishes', async () => {
    const first = await createTestGroup(['Ben'])
    const second = await createTestGroup(['Cara'])
    const anna = await register(first.id, 'Anna')

    expect((await store.joinGroup(queryable, second.id, anna.id)).ok).toBe(true)
    expect((await store.joinGroup(queryable, second.id, anna.id)).ok).toBe(true)
    expect((await store.getGroup(queryable, second.id))?.users.filter(u => u.accountId === anna.id)).toHaveLength(1)

    const inFirst = await participant(first.id, anna.id)
    const inSecond = await participant(second.id, anna.id)
    expect(inFirst.id).not.toBe(inSecond.id)
    expect(inSecond.name).toBe('Anna')

    await store.saveWish(queryable, first.id, inFirst.id, { title: 'Book', description: 'A good one' })
    expect((await participant(first.id, anna.id)).wish?.title).toBe('Book')
    expect((await participant(second.id, anna.id)).wish).toBeNull()

    const groups = await store.listAccountGroups(queryable, anna.id)
    expect(groups.map(g => g.id).sort()).toEqual([first.id, second.id].sort())
    expect(await store.findParticipant(queryable, (await createTestGroup([])).id, anna.id)).toBeNull()
  })

  test('refuses to join a group once its selection phase has started', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    await addWishes(group)
    expect((await store.startSelection(queryable, group.id)).ok).toBe(true)
    const dora = await register((await createTestGroup([])).id, 'Dora')

    expect((await store.joinGroup(queryable, group.id, dora.id)).ok).toBe(false)
    expect(await store.findParticipant(queryable, group.id, dora.id)).toBeNull()

    const anna = group.users.find(user => user.name === 'Anna')
    if (!anna) throw new Error('Anna is missing')
    expect((await store.joinGroup(queryable, group.id, anna.accountId)).ok).toBe(true)
  })

  test('refuses registration once the selection phase has started', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    await addWishes(group)
    expect((await store.startSelection(queryable, group.id)).ok).toBe(true)

    const late = await store.registerAccount(queryable, group.id, 'Dora', await hashPassword('whatever1'))
    expect(late.ok).toBe(false)
    expect(await queryable.query('SELECT id FROM wichteln_accounts WHERE name = $1', ['Dora'])).toEqual([])
  })

  test('removes only the membership during the wish phase', async () => {
    const group = await createTestGroup()
    const other = await createTestGroup([])
    const dora = await register(group.id, 'Dora')
    await store.joinGroup(queryable, other.id, dora.id)

    await store.removeParticipant(queryable, group.id, (await participant(group.id, dora.id)).id)

    const withoutDora = await store.getGroup(queryable, group.id)
    expect(withoutDora?.users.map(user => user.name)).not.toContain('Dora')
    expect(await store.findParticipant(queryable, other.id, dora.id)).not.toBeNull()
    expect(await store.authenticateAccount(queryable, 'Dora', 'Dora-password')).not.toBeNull()
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

  test('authenticates an account by name and password, ignoring the name case', async () => {
    await createTestGroup(['Anna', 'Ben'])

    const found = await store.authenticateAccount(queryable, 'ANNA', 'Anna-password')
    expect(found?.name).toBe('Anna')
    expect(found?.mustChangePassword).toBe(false)
    expect(await store.authenticateAccount(queryable, 'Anna', 'wrong')).toBeNull()
    expect(await store.authenticateAccount(queryable, 'Nobody', 'Anna-password')).toBeNull()
  })

  test('stores only password hashes', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    await register(group.id, 'Cara', 'same-password')
    await register(group.id, 'Dora', 'same-password')

    const rows = await queryable.query<{ name: string, password_hash: string }>(
      'SELECT name, password_hash FROM wichteln_accounts',
    )
    const hashes = rows.map(row => row.password_hash)
    expect(hashes.every(hash => hash.startsWith('scrypt$'))).toBe(true)
    expect(hashes).not.toContain('same-password')
    expect(new Set(hashes).size).toBe(rows.length)
  })

  test('resets the account password to a generated one and forces a change', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    const anna = group.users.find(user => user.name === 'Anna')
    if (!anna) throw new Error('Anna is missing')

    const reset = await store.resetPassword(queryable, group.id, anna.id)
    if (!reset.ok) throw new Error(reset.error)

    expect(reset.value).toMatch(/^[a-zA-Z2-9]{10}$/)
    expect(await store.authenticateAccount(queryable, 'Anna', 'Anna-password')).toBeNull()
    expect((await store.authenticateAccount(queryable, 'Anna', reset.value))?.mustChangePassword).toBe(true)

    const rows = await queryable.query<{ password_hash: string }>('SELECT password_hash FROM wichteln_accounts WHERE id = $1', [anna.accountId])
    expect(rows[0]?.password_hash).not.toBe(reset.value)

    const other = await createTestGroup(['Cara'])
    expect((await store.resetPassword(queryable, other.id, anna.id)).ok).toBe(false)
  })

  test('changes a password and ends a forced change', async () => {
    const group = await createTestGroup(['Anna', 'Ben'])
    const anna = group.users.find(user => user.name === 'Anna')
    if (!anna) throw new Error('Anna is missing')
    const reset = await store.resetPassword(queryable, group.id, anna.id)
    if (!reset.ok) throw new Error(reset.error)

    expect((await store.changePassword(queryable, anna.accountId, await hashPassword('new-password'))).ok).toBe(true)

    expect(await store.authenticateAccount(queryable, 'Anna', reset.value)).toBeNull()
    const signedIn = await store.authenticateAccount(queryable, 'Anna', 'new-password')
    expect(signedIn?.mustChangePassword).toBe(false)
    expect((await store.getAccount(queryable, anna.accountId))?.mustChangePassword).toBe(false)
  })

  test('deletes a group with its memberships but keeps the accounts', async () => {
    const group = await createTestGroup()
    const anna = group.users.find(user => user.name === 'Anna')
    if (!anna) throw new Error('Anna is missing')

    await store.deleteGroup(queryable, group.id)

    expect(await store.getGroup(queryable, group.id)).toBeNull()
    expect(await store.listGroups(queryable)).toHaveLength(0)
    expect(await store.listAccountGroups(queryable, anna.accountId)).toEqual([])
    expect(await store.authenticateAccount(queryable, 'Anna', 'Anna-password')).not.toBeNull()
  })
})
