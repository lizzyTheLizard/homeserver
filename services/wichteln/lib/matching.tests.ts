import { describe, expect, test } from 'vitest'
import { selectableWishOwners } from './matching'
import type { Group, User } from './store'

function makeUser(id: string, hasWish = true): User {
  return {
    id,
    name: id,
    wish: hasWish ? { title: `Wish ${id}`, description: `Description ${id}` } : null,
    selectedWishOf: null,
  }
}

function makeGroup(users: User[], phase: Group['phase'] = 'selection'): Group {
  return {
    id: 'group-1',
    name: 'Test group',
    phase,
    inviteToken: 'token',
    createdAt: '2026-01-01T00:00:00.000Z',
    users,
  }
}

describe('selectableWishOwners', () => {
  test('never offers the participant their own wish', () => {
    const group = makeGroup([makeUser('a'), makeUser('b'), makeUser('c')])

    expect(selectableWishOwners(group, 'a')).not.toContain('a')
  })

  test('does not offer a wish that has already been selected', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    const c = makeUser('c')
    a.selectedWishOf = 'b'
    const group = makeGroup([a, b, c])

    const selectable = selectableWishOwners(group, 'c')

    expect(selectable).not.toContain('b')
    expect(selectable).toContain('a')
  })

  test('does not offer a wish whose selection would leave another participant without a foreign wish', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    const c = makeUser('c')
    a.selectedWishOf = 'c'
    const group = makeGroup([a, b, c])

    expect(selectableWishOwners(group, 'c')).toEqual(['b'])
  })

  test('does not offer a participant without a wish', () => {
    const group = makeGroup([makeUser('a'), makeUser('b', false), makeUser('c')])

    expect(selectableWishOwners(group, 'a')).not.toContain('b')
  })

  test('lets every participant end up with a foreign wish', () => {
    const users = ['a', 'b', 'c', 'd', 'e'].map(id => makeUser(id))
    const group = makeGroup(users)
    const chosen = new Set<string>()

    for (const user of users) {
      const selectable = selectableWishOwners(group, user.id)
      expect(selectable.length).toBeGreaterThan(0)

      const pick = selectable[0]
      expect(pick).not.toBe(user.id)
      expect(chosen.has(pick)).toBe(false)

      chosen.add(pick)
      user.selectedWishOf = pick
    }

    expect(chosen.size).toBe(users.length)
  })

  test('offers nothing outside the selection phase', () => {
    const group = makeGroup([makeUser('a'), makeUser('b')], 'wishes')

    expect(selectableWishOwners(group, 'a')).toEqual([])
  })

  test('offers nothing to a participant who has already selected', () => {
    const a = makeUser('a')
    const b = makeUser('b')
    a.selectedWishOf = 'b'
    const group = makeGroup([a, b])

    expect(selectableWishOwners(group, 'a')).toEqual([])
  })
})
