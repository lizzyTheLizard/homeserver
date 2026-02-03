import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { loadProjects } from './server'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadProjects', () => {
  test('Empty projects list', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadProjects()

    expect(result).toEqual([])
  })

  test('Load projects for user', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project1 = { id: randomUUID(), name: 'Project Alpha', owner_id: task.id, archived: false }
    const project2 = { id: randomUUID(), name: 'Project Beta', owner_id: task.id, archived: false }
    const project3 = { id: randomUUID(), name: 'Project Gamma', owner_id: task.id, archived: false }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project1)
      await createOrModifyProject(tx, project2)
      await createOrModifyProject(tx, project3)
    })

    const result = await loadProjects()

    expect(result).toHaveLength(3)
    expect(result.map(p => p.name).sort()).toEqual(['Project Alpha', 'Project Beta', 'Project Gamma'])
    expect(result.every(p => p.owner_id === task.id)).toBe(true)
  })

  test('Load projects includes archived projects', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project1 = { id: randomUUID(), name: 'Active Project', owner_id: task.id, archived: false }
    const project2 = { id: randomUUID(), name: 'Archived Project', owner_id: task.id, archived: true }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project1)
      await createOrModifyProject(tx, project2)
    })

    const result = await loadProjects()

    expect(result).toHaveLength(2)
    expect(result.find(p => p.name === 'Active Project')?.archived).toBe(false)
    expect(result.find(p => p.name === 'Archived Project')?.archived).toBe(true)
  })

  test('Only loads projects for authenticated user', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const ownProject = { id: randomUUID(), name: 'My Project', owner_id: task.id, archived: false }
    const otherProject = { id: randomUUID(), name: 'Other Project', owner_id: 'other-user-id', archived: false }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, ownProject)
      await createOrModifyProject(tx, otherProject)
    })

    const result = await loadProjects()

    expect(result).toEqual([{
      id: ownProject.id,
      name: 'My Project',
      owner_id: task.id,
      archived: false,
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
    }])
  })

  test('Returns all project fields', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadProjects()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      id: project.id,
      name: project.name,
      owner_id: task.id,
      archived: false,
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
    }))
  })

  test('Multiple users have separate project lists', async ({ task }) => {
    const user1: UserSession = { sub: task.id, name: 'User 1', email: 'user1@example.com', applications: ['cash'] }
    const user2: UserSession = { sub: 'user-2-id', name: 'User 2', email: 'user2@example.com', applications: ['cash'] }

    const project1 = { id: randomUUID(), name: 'User 1 Project', owner_id: task.id, archived: false }
    const project2 = { id: randomUUID(), name: 'User 2 Project', owner_id: 'user-2-id', archived: false }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project1)
      await createOrModifyProject(tx, project2)
    })

    // Load as user 1
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user1)
    const result1 = await loadProjects()
    expect(result1).toHaveLength(1)
    expect(result1[0].name).toBe('User 1 Project')

    // Load as user 2
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user2)
    const result2 = await loadProjects()
    expect(result2).toHaveLength(1)
    expect(result2[0].name).toBe('User 2 Project')
  })
})
