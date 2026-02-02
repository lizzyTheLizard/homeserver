import { afterEach, describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/db'
import { v4 as randomUUID } from 'uuid'
import { deleteProject, loadProjects, saveProject } from './server'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Temporal } from '@js-temporal/polyfill'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadProjects', () => {
  afterEach(async () => {
    // Clean up all projects after each test
    await transactional(async (tx) => {
      await tx.query('DELETE FROM project')
    })
  })

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

  test('Load projects for all users', async ({ task }) => {
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
      name: ownProject.name,
      owner_id: task.id,
      archived: false,
      created_at: expect.any(Temporal.Instant) as Temporal.Instant,
      updated_at: expect.any(Temporal.Instant) as Temporal.Instant,
    }, {
      id: otherProject.id,
      name: otherProject.name,
      owner_id: 'other-user-id',
      archived: false,
      created_at: expect.any(Temporal.Instant) as Temporal.Instant,
      updated_at: expect.any(Temporal.Instant) as Temporal.Instant,
    }])
  })

  test('Returns all project fields', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadProjects()

    expect(result).toEqual([{
      id: project.id,
      name: project.name,
      owner_id: task.id,
      archived: false,
      created_at: expect.any(Temporal.Instant) as Temporal.Instant,
      updated_at: expect.any(Temporal.Instant) as Temporal.Instant,
    }])
  })
})

describe('saveProject', () => {
  afterEach(async () => {
    // Clean up all projects after each test
    await transactional(async (tx) => {
      await tx.query('DELETE FROM project')
    })
  })

  test('Create a new project', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const projectInput = { id: randomUUID(), name: 'New Project', owner_id: task.id, archived: false }
    const response = await saveProject(projectInput)

    if (!response.success) throw new Error('Expected success response')
    expect(response.data).toEqual(expect.objectContaining(projectInput))
  })

  test('Update an existing project', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const projectId = randomUUID()
    const originalProject = { id: projectId, name: 'Original Name', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, originalProject))

    const updatedProject = { id: projectId, name: 'Updated Name', owner_id: task.id, archived: true }
    const response = await saveProject(updatedProject)

    if (!response.success) throw new Error('Expected success response')
    expect(response.data).toEqual(expect.objectContaining(updatedProject))
  })

  test('Requires admin authentication', async ({ task }) => {
    vi.mocked(getAuthenticatedUserSession).mockRejectedValue(new Error('Unauthorized'))

    const projectInput = { id: randomUUID(), name: 'New Project', owner_id: task.id, archived: false }
    const response = await saveProject(projectInput)

    expect(response).toEqual({ success: false, error: expect.any(String) as string })
  })
})

describe('deleteProject', () => {
  afterEach(async () => {
    // Clean up all projects after each test
    await transactional(async (tx) => {
      await tx.query('DELETE FROM project')
    })
  })

  test('Delete an existing project', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Project to Delete', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const response = await deleteProject(project.id)

    expect(response.success).toBe(true)

    // Verify the project was actually deleted
    const projects = await loadProjects()
    expect(projects.find(p => p.id === project.id)).toBeUndefined()
  })

  test('Delete non-existent project succeeds', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const nonExistentId = randomUUID()
    const response = await deleteProject(nonExistentId)

    expect(response.success).toBe(true)
  })

  test('Requires admin authentication', async () => {
    vi.mocked(getAuthenticatedUserSession).mockRejectedValue(new Error('Unauthorized'))

    const response = await deleteProject(randomUUID())

    expect(response).toEqual({ success: false, error: expect.any(String) as string })
  })
})
