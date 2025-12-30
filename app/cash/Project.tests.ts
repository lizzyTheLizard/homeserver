import { describe, expect, test } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/db'
import { v4 as randomUUID } from 'uuid'
import { createOrModifyProject, findProjectById, findProjectsByOwner } from './Project'

describe('Find Projects', () => {
  test('Empty', async ({ task }) => {
    await expect(nontransactional(c => findProjectById(c, task.id, randomUUID()))).resolves.toEqual(undefined)
    await expect(nontransactional(c => findProjectsByOwner(c, task.id))).resolves.toEqual([])
  })

  test('Single', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const result = await transactional(tx => createOrModifyProject(tx, input))
    await expect(nontransactional(c => findProjectById(c, task.id, input.id))).resolves.toEqual(result)
    await expect(nontransactional(c => findProjectsByOwner(c, task.id))).resolves.toEqual([result])
  })
})

describe('Create Project', () => {
  test('Create new project', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const result = await transactional(tx => createOrModifyProject(tx, input))
    expect(result).toEqual({
      ...input,
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date,
    })
  })
})

describe('Update Project', () => {
  test('Update existing project', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const input1 = { id: input.id, name: 'Test Project 2', owner_id: 'newID', archived: true }
    await transactional(c => createOrModifyProject(c, input))
    const result = await transactional(tx => createOrModifyProject(tx, input1))
    expect(result).toEqual({
      ...input1,
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date,
    })
  })
})
