import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { initialize } from './server'
import { AccountInput, createOrModifyAccount } from '@/app/cash/_data/Account'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { findForPeriod, type MonthlyInput } from '@/app/cash/_data/Monthly'
import { createOrModifyProject } from '@/app/cash/_data/Project'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('initialize', () => {
  test('Creates monthly closing successfully', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const data: MonthlyInput = {
      id: randomUUID(),
      project_id: project.id,
      period: { year: 2024, month: 1, openEnded: false, day: undefined, current: false },
      shared_account_id: account.id,
      neon_account_id: account.id,
      credit_card_account_id: account.id,
      state: 'NEON',
      neon_transactions: [
        { date: '2024-01-01', order: 1, amount: 100, description: 'Transaction 1' },
        { date: '2024-01-02', order: 2, amount: 200, description: 'Transaction 2' },
      ],
      shared_transactions: [],
    }

    const response = await initialize(data)
    if (!response.success) throw new Error(`Initialization failed: ${response.error}`)

    const created = await transactional(async tx => findForPeriod(tx, task.id, data.project_id, data.period))
    expect(created).toEqual(expect.objectContaining(data))
  })
})

// TODO: Add tests for loadData, addNeonTransactions, markAsChecked, addSharedTransactions
