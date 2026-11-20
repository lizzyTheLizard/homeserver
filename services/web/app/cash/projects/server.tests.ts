import { describe, expect, test, vi } from 'vitest'
import type { UserSession } from '@/app/shared/auth/session'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { loadProjects } from './server'
import { v4 as randomUUID } from 'uuid'
import { transactional } from '@/app/shared/_external/db/access'

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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadProjects()

    expect(result).toEqual([])
  })

  test('Load projects for user', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project1 = { archived: false, id: randomUUID(), name: 'Project Alpha', owner_email: task.id },
     project2 = { archived: false, id: randomUUID(), name: 'Project Beta', owner_email: task.id },
     project3 = { archived: false, id: randomUUID(), name: 'Project Gamma', owner_email: task.id }
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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project1 = { archived: false, id: randomUUID(), name: 'Active Project', owner_email: task.id },
     project2 = { archived: true, id: randomUUID(), name: 'Archived Project', owner_email: task.id }
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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const ownProject = { archived: false, id: randomUUID(), name: 'My Project', owner_email: task.id },
     otherProject = { archived: false, id: randomUUID(), name: 'Other Project', owner_email: 'other-user-id' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, ownProject)
      await createOrModifyProject(tx, otherProject)
    })

    const result = await loadProjects()

    expect(result).toEqual([{
      archived: false,
      created_at: expect.any(String) as string,
      id: ownProject.id,
      name: 'My Project',
      owner_email: task.id,
      updated_at: expect.any(String) as string,
    }])
  })

  test('Returns all project fields', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadProjects()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      archived: false,
      created_at: expect.any(String) as string,
      id: project.id,
      name: project.name,
      owner_email: task.id,
      updated_at: expect.any(String) as string,
    }))
  })

  test('Multiple users have separate project lists', async ({ task }) => {
    const user1: UserSession = { applications: ['cash'], email: task.id, name: 'User 1' },
     user2: UserSession = { applications: ['cash'], email: 'user-2-id', name: 'User 2' },

     project1 = { archived: false, id: randomUUID(), name: 'User 1 Project', owner_email: task.id },
     project2 = { archived: false, id: randomUUID(), name: 'User 2 Project', owner_email: 'user-2-id' }
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
