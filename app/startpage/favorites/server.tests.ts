import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { loadFavorites, saveFavorite, deleteFavorite } from './server'
import { createOrModifyFavorite } from '@/app/startpage/_data/Favorite'
import type { UserSession } from '@/app/shared/auth/auth'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'

vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

const makeInput = (id = crypto.randomUUID()) => ({ id, position: 1, name: 'GitHub', url: 'https://github.com', description: 'Source code' })

describe('loadFavorites', () => {
  test('returns empty list when no favorites', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadFavorites()

    expect(result).toEqual([])
  })

  test('returns favorites for authenticated user', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await transactional(tx => createOrModifyFavorite(tx, task.id, makeInput()))

    const result = await loadFavorites()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'GitHub', url: 'https://github.com', owner_email: task.id })
  })

  test('does not return other users favorites', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await transactional(tx => createOrModifyFavorite(tx, task.id + '_other', { ...makeInput(), name: 'Other' }))

    const result = await loadFavorites()

    expect(result).toEqual([])
  })
})

describe('saveFavorite', () => {
  test('creates a new favorite', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const input = makeInput()
    const result = await saveFavorite(input)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toMatchObject({ id: input.id, name: 'GitHub', url: 'https://github.com', owner_email: task.id })
  })

  test('updates an existing favorite', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const input = makeInput()
    await transactional(tx => createOrModifyFavorite(tx, task.id, input))
    const result = await saveFavorite({ ...input, name: 'GitLab', url: 'https://gitlab.com' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toMatchObject({ id: input.id, name: 'GitLab', url: 'https://gitlab.com' })
  })
})

describe('deleteFavorite', () => {
  test('deletes an existing favorite', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const created = await transactional(tx => createOrModifyFavorite(tx, task.id, makeInput()))
    const result = await deleteFavorite(created.id)

    expect(result.success).toBe(true)

    const favorites = await loadFavorites()
    expect(favorites).toHaveLength(0)
  })

  test('cannot delete another users favorite', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const otherId = task.id + '_other'
    const created = await transactional(tx => createOrModifyFavorite(tx, otherId, makeInput()))
    await deleteFavorite(created.id)

    const result = await transactional(async (tx) => {
      const { findFavoritesByOwner } = await import('@/app/startpage/_data/Favorite')
      return findFavoritesByOwner(tx, otherId)
    })
    expect(result).toHaveLength(1)
  })
})
