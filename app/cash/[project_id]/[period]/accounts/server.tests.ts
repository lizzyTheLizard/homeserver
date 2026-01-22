/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { transactional } from '@/app/shared/db'
import { v4 as randomUUID } from 'uuid'
import { loadAccounts, saveAccount, deleteAccount } from './server'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import { createOrModifyAccount } from '@/app/cash/_data/Account'
import type { AccountInput } from '@/app/cash/_data/Account'
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

describe('loadAccounts', () => {
  test('Empty accounts list', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadAccounts(project.id)

    expect(result).toEqual([])
  })

  test('Load accounts for project', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const account3 = { id: randomUUID(), project_id: project.id, name: 'Bank', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createOrModifyAccount(tx, task.id, account3)
    })

    const result = await loadAccounts(project.id)

    expect(result).toHaveLength(3)
    // Should be sorted by name
    expect(result.map(a => a.name)).toEqual(['Bank', 'Cash', 'Revenue'])
    expect(result[0]).toEqual(expect.objectContaining({ name: 'Bank', type: 'Asset' }))
    expect(result[1]).toEqual(expect.objectContaining({ name: 'Cash', type: 'Asset' }))
    expect(result[2]).toEqual(expect.objectContaining({ name: 'Revenue', type: 'Income' }))
  })

  test('Load accounts includes archived accounts', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Active Account', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Archived Account', type: 'Income', archived: true } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const result = await loadAccounts(project.id)

    expect(result).toHaveLength(2)
    expect(result.find(a => a.name === 'Active Account')?.archived).toBe(false)
    expect(result.find(a => a.name === 'Archived Account')?.archived).toBe(true)
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const projectId = randomUUID()

    await expect(loadAccounts(projectId)).rejects.toThrow()
  })

  test('Cannot load accounts for other user project', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: 'other-user-id', archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    await expect(loadAccounts(project.id)).rejects.toThrow()
  })
})

describe('saveAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Create new account', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const accountInput = { id: randomUUID(), project_id: project.id, name: 'New Account', type: 'Asset', archived: false } as AccountInput
    const result = await saveAccount(accountInput)

    if (!result.success) throw new Error('Expected success response')
    expect(result.data).toEqual(expect.objectContaining(accountInput))
    expect(result.data.owner_id).toEqual(task.id)
  })

  test('Create account with all account types', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const accountTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'] as const

    for (const type of accountTypes) {
      const accountInput = { id: randomUUID(), project_id: project.id, name: `Test ${type}`, type, archived: false } as AccountInput
      const result = await saveAccount(accountInput)

      if (!result.success) throw new Error(`Expected success response for type ${type}`)
      expect(result.data.type).toEqual(type)
    }
  })

  test('Update existing account', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Original Name', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const updatedAccount = { ...account, name: 'Updated Name', type: 'Expense', archived: true } as AccountInput
    const result = await saveAccount(updatedAccount)

    if (!result.success) throw new Error('Expected success response')
    expect(result.data).toEqual(expect.objectContaining(updatedAccount))
    expect(result.data.owner_id).toEqual(task.id)
  })

  test('Update account for other users fails', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Original Name', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const otherUser: UserSession = { ...user, sub: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const updatedAccount = { ...account, name: 'Updated Name' } as AccountInput
    await expect(saveAccount(updatedAccount)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Invalid Input', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const accountInput = { id: randomUUID(), project_id: project.id, name: 'Test Account', type: 'Asset', archived: false } as AccountInput
    await expect(saveAccount({ ...accountInput, id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, id: 'invalid-uuid' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, id: undefined as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, project_id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, project_id: 'invalid-uuid' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, project_id: randomUUID() })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, project_id: undefined as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, name: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, name: undefined as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, type: '' as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, type: 'InvalidType' as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, type: undefined as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, archived: 'yes' as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveAccount({ ...accountInput, archived: 1 as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })
})

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Delete existing account', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Account to Delete', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const result = await deleteAccount(account.id)

    if (!result.success) throw new Error('Expected success response')

    // Verify account is deleted
    const accounts = await loadAccounts(project.id)
    expect(accounts).toHaveLength(0)
  })

  test('Delete account for other users', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Account to Delete', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const otherUser: UserSession = { ...user, sub: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await deleteAccount(account.id)

    if (!result.success) throw new Error('Expected success response')

    // Verify account is not deleted
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const accounts = await loadAccounts(project.id)
    expect(accounts).toHaveLength(1)
  })

  test('Delete non-existent account', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const nonExistentAccount = { id: randomUUID(), project_id: project.id, name: 'Does not exist', type: 'Asset', archived: false } as AccountInput
    await expect(deleteAccount(nonExistentAccount.id)).resolves.toEqual({ success: true })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    await expect(deleteAccount('')).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(deleteAccount('invalid-uuid')).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })
})
