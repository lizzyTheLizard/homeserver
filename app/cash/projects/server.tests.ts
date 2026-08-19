import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { loadProjects } from './server'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'

// Mock the auth module
vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadProjects', () => {
  test('Empty projects list', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadProjects()

    expect(result).toEqual([])
  })

  test('Load projects for user', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project1 = { id: randomUUID(), name: 'Project Alpha', owner_email: task.id, archived: false }
    const project2 = { id: randomUUID(), name: 'Project Beta', owner_email: task.id, archived: false }
    const project3 = { id: randomUUID(), name: 'Project Gamma', owner_email: task.id, archived: false }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project1)
      await createOrModifyProject(tx, project2)
      await createOrModifyProject(tx, project3)
    })

    const result = await loadProjects()

    expect(result).toHaveLength(3)
    expect(result.map(p => p.name).sort()).toEqual(['Project Alpha', 'Project Beta', 'Project Gamma'])
    expect(result.every(p => p.owner_email === task.id)).toBe(true)
  })

  test('Load projects includes archived projects', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project1 = { id: randomUUID(), name: 'Active Project', owner_email: task.id, archived: false }
    const project2 = { id: randomUUID(), name: 'Archived Project', owner_email: task.id, archived: true }
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
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const ownProject = { id: randomUUID(), name: 'My Project', owner_email: task.id, archived: false }
    const otherProject = { id: randomUUID(), name: 'Other Project', owner_email: 'other-user-id', archived: false }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, ownProject)
      await createOrModifyProject(tx, otherProject)
    })

    const result = await loadProjects()

    expect(result).toEqual([{
      id: ownProject.id,
      name: 'My Project',
      owner_email: task.id,
      archived: false,
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
    }])
  })

  test('Returns all project fields', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadProjects()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      id: project.id,
      name: project.name,
      owner_email: task.id,
      archived: false,
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
    }))
  })

  test('Multiple users have separate project lists', async ({ task }) => {
    const user1: UserSession = { name: 'User 1', email: task.id, applications: ['cash'] }
    const user2: UserSession = { name: 'User 2', email: 'user-2-id', applications: ['cash'] }

    const project1 = { id: randomUUID(), name: 'User 1 Project', owner_email: task.id, archived: false }
    const project2 = { id: randomUUID(), name: 'User 2 Project', owner_email: 'user-2-id', archived: false }
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
