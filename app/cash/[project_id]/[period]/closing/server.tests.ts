/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { initialize, addNeonTransactions, NeonTransactionInput, addSharedTransactions, markAsChecked } from './server'
import { AccountInput, createOrModifyAccount } from '@/app/cash/_data/Account'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createMonthlyClosing, findForPeriod, type MonthlyInput, type SharedTransaction } from '@/app/cash/_data/Monthly'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import { findTransactionsById } from '@/app/cash/_data/Transaction'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'

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

describe('addNeonTransactions', () => {
  test('Success', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const otherAccount = { id: randomUUID(), project_id: project.id, name: 'Expenses', type: 'Expense', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: otherAccount.id, state: 'NEON', neon_transactions: [{ date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' }, { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' }], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const neonTransactionInputs: NeonTransactionInput[] = [
      { order: 2, accountId: otherAccount.id, description: 'Salary - Employer' },
    ]

    const response = await addNeonTransactions(project.id, period, neonTransactionInputs)
    expect(response.success).toBe(true)

    const updated = await transactional(async tx => findForPeriod(tx, task.id, project.id, monthly.period))
    expect(updated).toEqual(expect.objectContaining({
      state: 'NEONCHECK',
      neon_transactions: [
        { date: '2024-01-05', order: 1, amount: -50, description: 'Groceries', transaction_id: undefined },
        { date: '2024-01-10', order: 2, amount: 100, description: 'Salary', transaction_id: expect.any(String) as string },
      ],
    }))
    const transaction = await transactional(async tx => findTransactionsById(tx, task.id, updated!.neon_transactions[1].transaction_id!))
    expect(transaction).toEqual(expect.objectContaining({
      credit_account_id: otherAccount.id,
      debit_account_id: neonAccount.id,
      amount: 100,
      description: 'Salary - Employer',
    }))
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const neonTransactionInputs: NeonTransactionInput[] = [
      { order: 1, accountId: account.id, description: 'Transaction' },
    ]

    const response = await addNeonTransactions(project.id, period, neonTransactionInputs)
    expect(response).toEqual({ success: false, error: 'Monthly closing not found or not in NEON state' })
  })

  test('Fails when monthly state is not NEON', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const otherAccount = { id: randomUUID(), project_id: project.id, name: 'Expenses', type: 'Expense', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: otherAccount.id, state: 'NEONCHECK', neon_transactions: [{ date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' }, { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' }], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const neonTransactionInputs: NeonTransactionInput[] = [
      { order: 1, accountId: otherAccount.id, description: 'Groceries' },
    ]

    const response = await addNeonTransactions(project.id, monthly.period, neonTransactionInputs)
    expect(response).toEqual({ success: false, error: 'Monthly closing not found or not in NEON state' })
  })

  test('Fails with invalid transaction input - missing order', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const otherAccount = { id: randomUUID(), project_id: project.id, name: 'Expenses', type: 'Expense', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: otherAccount.id, state: 'NEON', neon_transactions: [{ date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' }, { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' }], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const neonTransactionInputs = [
      { accountId: otherAccount.id, description: 'Groceries' },
    ] as NeonTransactionInput[]

    const response = await addNeonTransactions(project.id, monthly.period, neonTransactionInputs)
    expect(response).toEqual({ success: false, error: 'Order can\'t be blank' })
  })

  test('Fails with invalid transaction input - invalid account UUID', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const otherAccount = { id: randomUUID(), project_id: project.id, name: 'Expenses', type: 'Expense', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: otherAccount.id, state: 'NEON', neon_transactions: [{ date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' }, { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' }], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const neonTransactionInputs = [
      { order: 1, accountId: 'not-a-uuid', description: 'Groceries' },
    ] as NeonTransactionInput[]

    const response = await addNeonTransactions(project.id, monthly.period, neonTransactionInputs)
    expect(response).toEqual({ success: false, error: 'Account id must be a valid UUID' })
  })
})

describe('addSharedTransactions', () => {
  test('Success', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const sharedTransactions: SharedTransaction[] = [
      { transaction_id: randomUUID(), category: 'Food' },
      { transaction_id: randomUUID(), category: 'Transport' },
    ]

    const response = await addSharedTransactions(project.id, period, sharedTransactions)
    expect(response.success).toBe(true)

    const updated = await transactional(async tx => findForPeriod(tx, task.id, project.id, monthly.period))
    expect(updated).toEqual(expect.objectContaining({
      state: 'FINISHED',
      shared_transactions: sharedTransactions,
    }))
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
    })

    const sharedTransactions: SharedTransaction[] = [
      { transaction_id: randomUUID(), category: 'Food' },
    ]

    const response = await addSharedTransactions(project.id, period, sharedTransactions)
    expect(response).toEqual({ success: false, error: 'Monthly closing not found or not in SHARED state' })
  })

  test('Fails when monthly state is not SHARED', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEON', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const sharedTransactions: SharedTransaction[] = [
      { transaction_id: randomUUID(), category: 'Food' },
    ]

    const response = await addSharedTransactions(project.id, monthly.period, sharedTransactions)
    expect(response).toEqual({ success: false, error: 'Monthly closing not found or not in SHARED state' })
  })

  test('Fails with invalid transaction input - missing transaction_id', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const sharedTransactions = [
      { category: 'Food' },
    ] as SharedTransaction[]

    const response = await addSharedTransactions(project.id, monthly.period, sharedTransactions)
    expect(response).toEqual({ success: false, error: 'Transaction id can\'t be blank' })
  })

  test('Fails with invalid transaction input - invalid transaction_id UUID', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const sharedTransactions = [
      { transaction_id: 'not-a-uuid', category: 'Food' },
    ] as SharedTransaction[]

    const response = await addSharedTransactions(project.id, monthly.period, sharedTransactions)
    expect(response).toEqual({ success: false, error: 'Transaction id must be a valid UUID' })
  })

  test('Fails with invalid transaction input - missing category', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const sharedTransactions = [
      { transaction_id: randomUUID() },
    ] as SharedTransaction[]

    const response = await addSharedTransactions(project.id, monthly.period, sharedTransactions)
    expect(response).toEqual({ success: false, error: 'Category can\'t be blank' })
  })
})

describe('markAsChecked', () => {
  test('Cannot mark NEON as checked', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEON', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response).toEqual({ success: false, error: 'Monthly closing not in CHECK state' })
  })

  test('Transitions from NEONCHECK to CREDITCARDCHECK', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEONCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response.success).toBe(true)

    const updated = await transactional(async tx => findForPeriod(tx, task.id, project.id, monthly.period))
    expect(updated?.state).toBe('CREDITCARDCHECK')
  })

  test('Transitions from CREDITCARDCHECK to SHAREDCHECK', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'CREDITCARDCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response.success).toBe(true)

    const updated = await transactional(async tx => findForPeriod(tx, task.id, project.id, monthly.period))
    expect(updated?.state).toBe('SHAREDCHECK')
  })

  test('Transitions from SHAREDCHECK to SHARED', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHAREDCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response.success).toBe(true)

    const updated = await transactional(async tx => findForPeriod(tx, task.id, project.id, monthly.period))
    expect(updated?.state).toBe('SHARED')
  })

  test('Cannot mark SHARED as checked', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response).toEqual({ success: false, error: 'Monthly closing not in CHECK state' })
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
    })

    const response = await markAsChecked(project.id, period)
    expect(response).toEqual({ success: false, error: 'Monthly closing not found' })
  })
})

// TODO: Add tests for loadData
