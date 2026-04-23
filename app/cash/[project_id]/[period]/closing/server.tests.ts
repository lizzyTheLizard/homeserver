import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { initialize, addNeonTransactions, NeonTransactionInput, addSharedTransactions, markAsChecked, loadData } from './server'
import { Account, AccountInput, createOrModifyAccount } from '@/app/cash/_data/Account'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createMonthlyClosing, findForPeriod, Monthly, type MonthlyInput, type SharedTransaction } from '@/app/cash/_data/Monthly'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import { findAllTransactions } from '@/app/cash/_data/Transaction'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { Closing, createClosing } from '@/app/cash/_data/Closing'
import { AccountTransaction, createAccountTransaction, type AccountTransactionInput } from '@/app/cash/_data/AccountTransaction'

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
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const neonTransactions = [
      { date: '2024-01-01', order: 1, amount: 100, description: 'Transaction 1' },
      { date: '2024-01-02', order: 2, amount: 200, description: 'Transaction 2' },
    ]
    const data: MonthlyInput = {
      id: randomUUID(),
      project_id: project.id,
      period,
      shared_account_id: account.id,
      neon_account_id: account.id,
      remaining_account_id: account.id,
      credit_card_account_id: account.id,
      state: 'NEON',
      neon_transactions: neonTransactions,
      shared_transactions: [],
    }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const neonTransactions = [
      { date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' },
      { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' },
    ]
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, remaining_account_id: remainingAccount.id, credit_card_account_id: otherAccount.id, state: 'NEON', neon_transactions: neonTransactions, shared_transactions: [] } as MonthlyInput
    const neonTransactionInputs: NeonTransactionInput[] = [
      { order: 2, accountId: otherAccount.id, description: 'Salary - Employer' },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const transaction = await transactional(async tx => findAllTransactions(tx, task.id, project.id, period))
    expect(transaction).toEqual([
      expect.objectContaining({
        credit_account_id: otherAccount.id,
        debit_account_id: neonAccount.id,
        amount: 100,
        description: 'Salary - Employer',
      }),
      expect.objectContaining({
        credit_account_id: neonAccount.id,
        debit_account_id: remainingAccount.id,
        date: '2024-01-31',
        amount: 50,
        description: 'Remaining amount for 2024-01',
      })])
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const neonTransactionInputs: NeonTransactionInput[] = [
      { order: 1, accountId: account.id, description: 'Transaction' },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

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
    const neonTransactions = [
      { date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' },
      { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' },
    ]
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, remaining_account_id: otherAccount.id, credit_card_account_id: otherAccount.id, state: 'NEONCHECK', neon_transactions: neonTransactions, shared_transactions: [] } as MonthlyInput
    const neonTransactionInputs: NeonTransactionInput[] = [
      { order: 1, accountId: otherAccount.id, description: 'Groceries' },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const neonTransactions = [
      { date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' },
      { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' },
    ]
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, remaining_account_id: otherAccount.id, credit_card_account_id: otherAccount.id, state: 'NEON', neon_transactions: neonTransactions, shared_transactions: [] } as MonthlyInput
    const neonTransactionInputs = [
      { accountId: otherAccount.id, description: 'Groceries' },
    ] as NeonTransactionInput[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const neonTransactions = [
      { date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' },
      { date: '2024-01-10', order: 2, amount: 100, description: 'Salary' },
    ]
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: otherAccount.id, neon_account_id: neonAccount.id, remaining_account_id: otherAccount.id, credit_card_account_id: otherAccount.id, state: 'NEON', neon_transactions: neonTransactions, shared_transactions: [] } as MonthlyInput
    const neonTransactionInputs = [
      { order: 1, accountId: 'not-a-uuid', description: 'Groceries' },
    ] as NeonTransactionInput[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, neon_account_id: neonAccount.id, remaining_account_id: remainingAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const sharedTransactions: SharedTransaction[] = [
      { transaction_id: randomUUID(), category: 'Food' },
      { transaction_id: randomUUID(), category: 'Transport' },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const sharedTransactions: SharedTransaction[] = [
      { transaction_id: randomUUID(), category: 'Food' },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEON', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const sharedTransactions: SharedTransaction[] = [
      { transaction_id: randomUUID(), category: 'Food' },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const sharedTransactions = [
      { category: 'Food' },
    ] as SharedTransaction[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const sharedTransactions = [
      { transaction_id: 'not-a-uuid', category: 'Food' },
    ] as SharedTransaction[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const sharedTransactions = [
      { transaction_id: randomUUID() },
    ] as SharedTransaction[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEON', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEONCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'CREDITCARDCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHAREDCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
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
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
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

describe('loadData', () => {
  test('NOT_FOUND', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      type: 'NOT_FOUND',
      lastMonthClosing: undefined,
      accounts: [expect.objectContaining(account1)],
    })
  })

  test('NEON', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEON', neon_transactions: [{ date: '2024-01-05', order: 1, amount: -50, description: 'Groceries' }], shared_transactions: [] } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      type: 'NEON',
      monthly: expect.objectContaining({ id: monthly.id, state: 'NEON' }) as Monthly,
      accounts: expect.arrayContaining([expect.objectContaining(creditCardAccount), expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount)]) as Account[],
    })
  })

  test('CHECK_ACCOUNT', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEONCHECK', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const transaction = { id: randomUUID(), ordering: 1, account_id: neonAccount.id, project_id: project.id, other_account_id: creditCardAccount.id, amount: 100, total_balance: 100, date: '2024-01-05', description: 'Test transaction' } as AccountTransactionInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
      await createAccountTransaction(tx, task.id, transaction)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      type: 'CHECK_ACCOUNT',
      monthly: expect.objectContaining({ id: monthly.id, state: 'NEONCHECK' }) as Monthly,
      account: expect.objectContaining(neonAccount) as Account,
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      transactions: expect.arrayContaining([expect.objectContaining(transaction)]) as AccountTransaction[],
      lastTransaction: undefined,
    })
  })

  test('SHARED', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'SHARED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const transaction = { id: randomUUID(), ordering: 1, account_id: sharedAccount.id, project_id: project.id, other_account_id: creditCardAccount.id, amount: 100, total_balance: 100, date: '2024-01-05', description: 'Test transaction 1' } as AccountTransactionInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
      await createAccountTransaction(tx, task.id, transaction)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      type: 'SHARED',
      monthly: expect.objectContaining({ id: monthly.id, state: 'SHARED' }) as Monthly,
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      transactions: expect.arrayContaining([expect.objectContaining(transaction)]) as AccountTransaction[],
      lastTransaction: undefined,
    })
  })

  test('FINISHED', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'FINISHED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const closing = { id: randomUUID(), project_id: project.id, date: '2024-02-01', capital_account_id: sharedAccount.id, profit_account_id: creditCardAccount.id, profit: 500 }
    const transaction1 = { id: randomUUID(), ordering: 1, account_id: neonAccount.id, project_id: project.id, other_account_id: creditCardAccount.id, amount: 100, total_balance: 100, date: '2024-01-05', description: 'Transaction for neon account' } as AccountTransactionInput
    const transaction2 = { id: randomUUID(), ordering: 1, account_id: sharedAccount.id, project_id: project.id, other_account_id: creditCardAccount.id, amount: 50, total_balance: 150, date: '2024-01-10', description: 'Transaction for shared account' } as AccountTransactionInput
    const transaction3 = { id: randomUUID(), ordering: 2, account_id: sharedAccount.id, project_id: project.id, other_account_id: creditCardAccount.id, amount: 100, total_balance: 100, date: '2023-12-10', description: 'Transaction for shared account' } as AccountTransactionInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createMonthlyClosing(tx, task.id, monthly)
      await createClosing(tx, task.id, closing)
      await createAccountTransaction(tx, task.id, transaction1)
      await createAccountTransaction(tx, task.id, transaction2)
      await createAccountTransaction(tx, task.id, transaction3)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      type: 'FINISHED',
      monthly: expect.objectContaining({ id: monthly.id, state: 'FINISHED' }) as Monthly,
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      transactionsSharedAccount: expect.arrayContaining([expect.objectContaining({ account_id: sharedAccount.id })]) as AccountTransaction[],
      lastTransactionSharedAccount: expect.objectContaining({ id: transaction3.id }) as AccountTransaction,
      transactionsNeonAccount: expect.arrayContaining([expect.objectContaining({ account_id: neonAccount.id })]) as AccountTransaction[],
      lastTransactionNeonAccount: undefined,
      latestClosing: expect.objectContaining({ id: closing.id }) as Closing,
    })
  })

  test('Returns ALREADY_CLOSED when a closing exists that is >= lastDay of period and monthly is not FINISHED', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'NEON', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const closing = { id: randomUUID(), project_id: project.id, date: '2024-01-31', capital_account_id: sharedAccount.id, profit_account_id: creditCardAccount.id, profit: 1000 }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
      await createClosing(tx, task.id, closing)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({ type: 'ALREADY_CLOSED' })
  })

  test('Returns FINISHED state even when there is an ALREADY_CLOSED situation if monthly is FINISHED', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const neonAccount = { id: randomUUID(), project_id: project.id, name: 'Neon', type: 'Asset', archived: false } as AccountInput
    const sharedAccount = { id: randomUUID(), project_id: project.id, name: 'Shared', type: 'Asset', archived: false } as AccountInput
    const remainingAccount = { id: randomUUID(), project_id: project.id, name: 'Remaining', type: 'Asset', archived: false } as AccountInput
    const creditCardAccount = { id: randomUUID(), project_id: project.id, name: 'Credit Card', type: 'Asset', archived: false } as AccountInput
    const period = { year: 2024, month: 1, openEnded: false, day: undefined, current: false } as MonthlyPeriod
    const monthly = { id: randomUUID(), project_id: project.id, period, shared_account_id: sharedAccount.id, remaining_account_id: remainingAccount.id, neon_account_id: neonAccount.id, credit_card_account_id: creditCardAccount.id, state: 'FINISHED', neon_transactions: [], shared_transactions: [] } as MonthlyInput
    const closing = { id: randomUUID(), project_id: project.id, date: '2024-01-31', capital_account_id: sharedAccount.id, profit_account_id: creditCardAccount.id, profit: 1000 }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
      await createClosing(tx, task.id, closing)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      type: 'FINISHED',
      monthly: expect.objectContaining({ id: monthly.id, state: 'FINISHED' }) as Monthly,
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      transactionsSharedAccount: [],
      lastTransactionSharedAccount: undefined,
      transactionsNeonAccount: [],
      lastTransactionNeonAccount: undefined,
      latestClosing: expect.objectContaining({ id: closing.id }) as Closing,
    })
  })
})
