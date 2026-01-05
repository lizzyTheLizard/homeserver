import { describe, expect, test } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/db'
import { AccountInput, createOrModifyAccount, findAllAccountsForProject, removeAccount } from './Account'
import { v4 as randomUUID } from 'uuid'
import { ACCOUNT_TYPES } from './AccountType'
import { BackendError } from '../shared/BackendError'
import { createOrModifyProject } from './Project'

describe('Find Accounts', () => {
  test('Empty', async ({ task }) => {
    const projectId = randomUUID()
    await expect(nontransactional(c => findAllAccountsForProject(c, task.id, projectId))).resolves.toEqual([])
  })

  test('Single', async ({ task }) => {
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Test Account',
      type: 'Asset',
      archived: false,
    }
    const result = await transactional(tx => createOrModifyAccount(tx, task.id, input))

    await expect(nontransactional(c => findAllAccountsForProject(c, task.id, projectId))).resolves.toEqual([result])
  })

  test('Filter by project', async ({ task }) => {
    const projectId1 = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project 1', owner_id: task.id, archived: false })).then(p => p.id)
    const projectId2 = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project 2', owner_id: task.id, archived: false })).then(p => p.id)
    const input1: AccountInput = {
      id: randomUUID(),
      project_id: projectId1,
      name: 'Project 1 Account',
      type: 'Asset',
      archived: false,
    }
    const input2: AccountInput = {
      id: randomUUID(),
      project_id: projectId2,
      name: 'Project 2 Account',
      type: 'Asset',
      archived: false,
    }

    await transactional(async (tx) => {
      await createOrModifyAccount(tx, task.id, input1)
      await createOrModifyAccount(tx, task.id, input2)
    })

    const accounts1 = await nontransactional(c => findAllAccountsForProject(c, task.id, projectId1))
    const accounts2 = await nontransactional(c => findAllAccountsForProject(c, task.id, projectId2))

    expect(accounts1).toHaveLength(1)
    expect(accounts1[0]?.name).toBe('Project 1 Account')
    expect(accounts2).toHaveLength(1)
    expect(accounts2[0]?.name).toBe('Project 2 Account')
  })

  test('Filter by owner', async ({ task }) => {
    const otherUser = randomUUID()
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Other User Account',
      type: 'Asset',
      archived: false,
    }

    await transactional(tx => createOrModifyAccount(tx, otherUser, input))

    await expect(nontransactional(c => findAllAccountsForProject(c, task.id, projectId))).resolves.toEqual([])
  })
})

describe('Create Or Modify Account', () => {
  test('Create new account', async ({ task }) => {
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'New Account',
      type: 'Asset',
      archived: false,
    }
    const result = await transactional(tx => createOrModifyAccount(tx, task.id, input))

    expect(result).toEqual(expect.objectContaining(input))
    expect(result.owner_id).toBe(task.id)
    expect(result.created_at).toBeInstanceOf(Date)
    expect(result.updated_at).toBeInstanceOf(Date)

    const accounts = await nontransactional(c => findAllAccountsForProject(c, task.id, projectId))
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toEqual(result)
  })

  test('Create account with all account types', async ({ task }) => {
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)

    for (const type of ACCOUNT_TYPES) {
      const input = {
        id: randomUUID(),
        project_id: projectId,
        name: `${type} Account`,
        type: type,
        archived: false,
      }
      const result = await transactional(tx => createOrModifyAccount(tx, task.id, input))
      expect(result.type).toBe(type)
    }

    const accounts = await nontransactional(c => findAllAccountsForProject(c, task.id, projectId))
    expect(accounts).toHaveLength(ACCOUNT_TYPES.length)
  })

  test('Create archived account', async ({ task }) => {
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Archived Account',
      type: 'Asset',
      archived: true,
    }
    const result = await transactional(tx => createOrModifyAccount(tx, task.id, input))

    expect(result.archived).toBe(true)
  })

  test('Update existing account', async ({ task }) => {
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Original Name',
      type: 'Asset',
      archived: false,
    }
    const input2: AccountInput = {
      id: input.id,
      project_id: projectId,
      name: 'Updated Name',
      type: 'Liability',
      archived: true,
    }

    await transactional(tx => createOrModifyAccount(tx, task.id, input))
    const result = await transactional(tx => createOrModifyAccount(tx, task.id, input2))

    expect(result).toEqual(expect.objectContaining(input2))
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime())

    const accounts = await nontransactional(c => findAllAccountsForProject(c, task.id, projectId))
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toEqual(result)
  })

  test('Update account project', async ({ task }) => {
    const projectId1 = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const projectId2 = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId1,
      name: 'Account',
      type: 'Asset',
      archived: false,
    }
    const input2: AccountInput = {
      ...input,
      project_id: projectId2,
    }

    await transactional(tx => createOrModifyAccount(tx, task.id, input))
    await expect(transactional(tx => createOrModifyAccount(tx, task.id, input2))).rejects.toThrow(BackendError)
  })

  test('Update account of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: otherUser, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Original Name',
      type: 'Asset',
      archived: false,
    }
    const input2: AccountInput = {
      id: input.id,
      project_id: projectId,
      name: 'Updated Name',
      type: 'Liability',
      archived: true,
    }

    await transactional(tx => createOrModifyAccount(tx, otherUser, input))
    await expect(transactional(tx => createOrModifyAccount(tx, task.id, input2))).rejects.not.toThrow(BackendError)
  })
})

describe('Remove Account', () => {
  test('Delete existing account', async ({ task }) => {
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Account to Delete',
      type: 'Asset',
      archived: false,
    }

    await transactional(async (tx) => {
      await createOrModifyAccount(tx, task.id, input)
    })

    await expect(nontransactional(c => findAllAccountsForProject(c, task.id, projectId))).resolves.toHaveLength(1)

    await transactional(tx => removeAccount(tx, task.id, input.id))

    await expect(nontransactional(c => findAllAccountsForProject(c, task.id, projectId))).resolves.toEqual([])
  })

  test('Delete non existing account', async ({ task }) => {
    const accountId = randomUUID()
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)

    await expect(transactional(tx => removeAccount(tx, task.id, accountId))).resolves.toBeUndefined()

    await expect(nontransactional(c => findAllAccountsForProject(c, task.id, projectId))).resolves.toEqual([])
  })

  test('Delete account of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const projectId = await transactional(tx => createOrModifyProject(tx, { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false })).then(p => p.id)
    const input: AccountInput = {
      id: randomUUID(),
      project_id: projectId,
      name: 'Other User Account',
      type: 'Asset',
      archived: false,
    }

    await transactional(tx => createOrModifyAccount(tx, otherUser, input))

    await expect(transactional(tx => removeAccount(tx, task.id, input.id))).resolves.toBeUndefined()

    // Account is still there because it belongs to other user
    const remainingAccounts = await nontransactional(c => findAllAccountsForProject(c, otherUser, projectId))
    expect(remainingAccounts).toHaveLength(1)
  })
})
