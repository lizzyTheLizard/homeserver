import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import type { NeonTransactionInput} from './server';
import { addNeonTransactions, addSharedTransactions, initialize, loadData, markAsChecked } from './server'
import type { Account, AccountInput} from '@/app/cash/_data/Account';
import { createOrModifyAccount } from '@/app/cash/_data/Account'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import type { Monthly} from '@/app/cash/_data/Monthly';
import { type MonthlyInput, type SharedTransaction, createMonthlyClosing, findForPeriod } from '@/app/cash/_data/Monthly'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import { findAllTransactions } from '@/app/cash/_data/Transaction'
import type { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import type { Closing} from '@/app/cash/_data/Closing';
import { createClosing } from '@/app/cash/_data/Closing'
import type { AccountTransaction} from '@/app/cash/_data/AccountTransaction';
import { type AccountTransactionInput, createAccountTransaction } from '@/app/cash/_data/AccountTransaction'

// Mock the auth module
vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('initialize', () => {
  test('Creates monthly closing successfully', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     neonTransactions = [
      { amount: 100, date: '2024-01-01', description: 'Transaction 1', order: 1 },
      { amount: 200, date: '2024-01-02', description: 'Transaction 2', order: 2 },
    ],
     data: MonthlyInput = {
      credit_card_account_id: account.id,
      id: randomUUID(),
      neon_account_id: account.id,
      neon_transactions: neonTransactions,
      period,
      project_id: project.id,
      remaining_account_id: account.id,
      shared_account_id: account.id,
      shared_transactions: [],
      state: 'NEON',
    }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const response = await initialize(data)
    if (!response.success) {throw new Error(`Initialization failed: ${response.error}`)}

    const created = await transactional(async tx => findForPeriod(tx, task.id, data.project_id, data.period))
    expect(created).toEqual(expect.objectContaining(data))
  })
})

describe('addNeonTransactions', () => {
  test('Success', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     otherAccount = { archived: false, id: randomUUID(), name: 'Expenses', project_id: project.id, type: 'Expense' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     neonTransactions = [
      { amount: -50, date: '2024-01-05', description: 'Groceries', order: 1 },
      { amount: 100, date: '2024-01-10', description: 'Salary', order: 2 },
    ],
     monthly = { credit_card_account_id: otherAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: neonTransactions, period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: otherAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput,
     neonTransactionInputs: NeonTransactionInput[] = [
      { accountId: otherAccount.id, description: 'Salary - Employer', order: 2 },
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
      neon_transactions: [
        { amount: -50, date: '2024-01-05', description: 'Groceries', order: 1, transaction_id: undefined },
        { amount: 100, date: '2024-01-10', description: 'Salary', order: 2, transaction_id: expect.any(String) as string },
      ],
      state: 'NEONCHECK',
    }))
    const transaction = await transactional(async tx => findAllTransactions(tx, task.id, project.id, period))
    expect(transaction).toEqual([
      expect.objectContaining({
        amount: 100,
        credit_account_id: otherAccount.id,
        debit_account_id: neonAccount.id,
        description: 'Salary - Employer',
      }),
      expect.objectContaining({
        amount: 50,
        credit_account_id: neonAccount.id,
        date: '2024-01-31',
        debit_account_id: remainingAccount.id,
        description: 'Remaining amount for 2024-01',
      })])
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     neonTransactionInputs: NeonTransactionInput[] = [
      { accountId: account.id, description: 'Transaction', order: 1 },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const response = await addNeonTransactions(project.id, period, neonTransactionInputs)
    expect(response).toEqual({ error: 'Monthly closing not found or not in NEON state', success: false })
  })

  test('Fails when monthly state is not NEON', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     otherAccount = { archived: false, id: randomUUID(), name: 'Expenses', project_id: project.id, type: 'Expense' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     neonTransactions = [
      { amount: -50, date: '2024-01-05', description: 'Groceries', order: 1 },
      { amount: 100, date: '2024-01-10', description: 'Salary', order: 2 },
    ],
     monthly = { credit_card_account_id: otherAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: neonTransactions, period, project_id: project.id, remaining_account_id: otherAccount.id, shared_account_id: otherAccount.id, shared_transactions: [], state: 'NEONCHECK' } as MonthlyInput,
     neonTransactionInputs: NeonTransactionInput[] = [
      { accountId: otherAccount.id, description: 'Groceries', order: 1 },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await addNeonTransactions(project.id, monthly.period, neonTransactionInputs)
    expect(response).toEqual({ error: 'Monthly closing not found or not in NEON state', success: false })
  })

  test('Fails with invalid transaction input - missing order', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     otherAccount = { archived: false, id: randomUUID(), name: 'Expenses', project_id: project.id, type: 'Expense' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     neonTransactions = [
      { amount: -50, date: '2024-01-05', description: 'Groceries', order: 1 },
      { amount: 100, date: '2024-01-10', description: 'Salary', order: 2 },
    ],
     monthly = { credit_card_account_id: otherAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: neonTransactions, period, project_id: project.id, remaining_account_id: otherAccount.id, shared_account_id: otherAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput,
     neonTransactionInputs = [
      { accountId: otherAccount.id, description: 'Groceries' },
    ] as NeonTransactionInput[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await addNeonTransactions(project.id, monthly.period, neonTransactionInputs)
    expect(response).toEqual({ error: 'Invalid input on field \'order\' (Invalid input: expected number, received undefined)', success: false })
  })

  test('Fails with invalid transaction input - invalid account UUID', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     otherAccount = { archived: false, id: randomUUID(), name: 'Expenses', project_id: project.id, type: 'Expense' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     neonTransactions = [
      { amount: -50, date: '2024-01-05', description: 'Groceries', order: 1 },
      { amount: 100, date: '2024-01-10', description: 'Salary', order: 2 },
    ],
     monthly = { credit_card_account_id: otherAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: neonTransactions, period, project_id: project.id, remaining_account_id: otherAccount.id, shared_account_id: otherAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput,
     neonTransactionInputs = [
      { accountId: 'not-a-uuid', description: 'Groceries', order: 1 },
    ] as NeonTransactionInput[]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, otherAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await addNeonTransactions(project.id, monthly.period, neonTransactionInputs)
    expect(response).toEqual({ error: 'Invalid input on field \'accountId\' (Invalid UUID)', success: false })
  })
})

describe('addSharedTransactions', () => {
  test('Success', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHARED' } as MonthlyInput,
     sharedTransactions: SharedTransaction[] = [
      { category: 'Food', transaction_id: randomUUID() },
      { category: 'Transport', transaction_id: randomUUID() },
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
      shared_transactions: sharedTransactions,
      state: 'FINISHED',
    }))
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     sharedTransactions: SharedTransaction[] = [
      { category: 'Food', transaction_id: randomUUID() },
    ]

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
    })

    const response = await addSharedTransactions(project.id, period, sharedTransactions)
    expect(response).toEqual({ error: 'Monthly closing not found or not in SHARED state', success: false })
  })

  test('Fails when monthly state is not SHARED', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput,
     sharedTransactions: SharedTransaction[] = [
      { category: 'Food', transaction_id: randomUUID() },
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
    expect(response).toEqual({ error: 'Monthly closing not found or not in SHARED state', success: false })
  })

  test('Fails with invalid transaction input - missing transaction_id', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHARED' } as MonthlyInput,
     sharedTransactions = [
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
    expect(response).toEqual({ error: 'Invalid input on field \'transaction_id\' (Invalid input: expected string, received undefined)', success: false })
  })

  test('Fails with invalid transaction input - invalid transaction_id UUID', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHARED' } as MonthlyInput,
     sharedTransactions = [
      { category: 'Food', transaction_id: 'not-a-uuid' },
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
    expect(response).toEqual({ error: 'Invalid input on field \'transaction_id\' (Invalid UUID)', success: false })
  })

  test('Fails with invalid transaction input - missing category', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHARED' } as MonthlyInput,
     sharedTransactions = [
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
    expect(response).toEqual({ error: 'Invalid input on field \'category\' (Invalid input: expected string, received undefined)', success: false })
  })
})

describe('markAsChecked', () => {
  test('Cannot mark NEON as checked', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response).toEqual({ error: 'Monthly closing not in CHECK state', success: false })
  })

  test('Transitions from NEONCHECK to CREDITCARDCHECK', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'NEONCHECK' } as MonthlyInput

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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'CREDITCARDCHECK' } as MonthlyInput

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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHAREDCHECK' } as MonthlyInput

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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHARED' } as MonthlyInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, sharedAccount)
      await createOrModifyAccount(tx, task.id, neonAccount)
      await createOrModifyAccount(tx, task.id, creditCardAccount)
      await createOrModifyAccount(tx, task.id, remainingAccount)
      await createMonthlyClosing(tx, task.id, monthly)
    })

    const response = await markAsChecked(project.id, period)
    expect(response).toEqual({ error: 'Monthly closing not in CHECK state', success: false })
  })

  test('Fails when monthly closing not found', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
    })

    const response = await markAsChecked(project.id, period)
    expect(response).toEqual({ error: 'Monthly closing not found', success: false })
  })
})

describe('loadData', () => {
  test('NOT_FOUND', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
    })

    const result = await loadData(project.id, period)
    expect(result).toEqual({
      accounts: [expect.objectContaining(account1)],
      lastMonthClosing: undefined,
      type: 'NOT_FOUND',
    })
  })

  test('NEON', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [{ amount: -50, date: '2024-01-05', description: 'Groceries', order: 1 }], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput

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
      accounts: expect.arrayContaining([expect.objectContaining(creditCardAccount), expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount)]) as Account[],
      monthly: expect.objectContaining({ id: monthly.id, state: 'NEON' }) as Monthly,
      type: 'NEON',
    })
  })

  test('CHECK_ACCOUNT', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'NEONCHECK' } as MonthlyInput,
     transaction = { account_id: neonAccount.id, amount: 100, date: '2024-01-05', description: 'Test transaction', id: randomUUID(), ordering: 1, other_account_id: creditCardAccount.id, project_id: project.id, total_balance: 100 } as AccountTransactionInput

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
      account: expect.objectContaining(neonAccount) as Account,
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      lastTransaction: undefined,
      monthly: expect.objectContaining({ id: monthly.id, state: 'NEONCHECK' }) as Monthly,
      transactions: expect.arrayContaining([expect.objectContaining(transaction)]) as AccountTransaction[],
      type: 'CHECK_ACCOUNT',
    })
  })

  test('SHARED', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'SHARED' } as MonthlyInput,
     transaction = { account_id: sharedAccount.id, amount: 100, date: '2024-01-05', description: 'Test transaction 1', id: randomUUID(), ordering: 1, other_account_id: creditCardAccount.id, project_id: project.id, total_balance: 100 } as AccountTransactionInput

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
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      lastTransaction: undefined,
      monthly: expect.objectContaining({ id: monthly.id, state: 'SHARED' }) as Monthly,
      transactions: expect.arrayContaining([expect.objectContaining(transaction)]) as AccountTransaction[],
      type: 'SHARED',
    })
  })

  test('FINISHED', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'FINISHED' } as MonthlyInput,
     closing = { capital_account_id: sharedAccount.id, date: '2024-02-01', id: randomUUID(), profit: 500, profit_account_id: creditCardAccount.id, project_id: project.id },
     transaction1 = { account_id: neonAccount.id, amount: 100, date: '2024-01-05', description: 'Transaction for neon account', id: randomUUID(), ordering: 1, other_account_id: creditCardAccount.id, project_id: project.id, total_balance: 100 } as AccountTransactionInput,
     transaction2 = { account_id: sharedAccount.id, amount: 50, date: '2024-01-10', description: 'Transaction for shared account', id: randomUUID(), ordering: 1, other_account_id: creditCardAccount.id, project_id: project.id, total_balance: 150 } as AccountTransactionInput,
     transaction3 = { account_id: sharedAccount.id, amount: 100, date: '2023-12-10', description: 'Transaction for shared account', id: randomUUID(), ordering: 2, other_account_id: creditCardAccount.id, project_id: project.id, total_balance: 100 } as AccountTransactionInput

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
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      lastTransactionNeonAccount: undefined,
      lastTransactionSharedAccount: expect.objectContaining({ id: transaction3.id }) as AccountTransaction,
      latestClosing: expect.objectContaining({ id: closing.id }) as Closing,
      monthly: expect.objectContaining({ id: monthly.id, state: 'FINISHED' }) as Monthly,
      transactionsNeonAccount: expect.arrayContaining([expect.objectContaining({ account_id: neonAccount.id })]) as AccountTransaction[],
      transactionsSharedAccount: expect.arrayContaining([expect.objectContaining({ account_id: sharedAccount.id })]) as AccountTransaction[],
      type: 'FINISHED',
    })
  })

  test('Returns ALREADY_CLOSED when a closing exists that is >= lastDay of period and monthly is not FINISHED', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'NEON' } as MonthlyInput,
     closing = { capital_account_id: sharedAccount.id, date: '2024-01-31', id: randomUUID(), profit: 1000, profit_account_id: creditCardAccount.id, project_id: project.id }

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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     neonAccount = { archived: false, id: randomUUID(), name: 'Neon', project_id: project.id, type: 'Asset' } as AccountInput,
     sharedAccount = { archived: false, id: randomUUID(), name: 'Shared', project_id: project.id, type: 'Asset' } as AccountInput,
     remainingAccount = { archived: false, id: randomUUID(), name: 'Remaining', project_id: project.id, type: 'Asset' } as AccountInput,
     creditCardAccount = { archived: false, id: randomUUID(), name: 'Credit Card', project_id: project.id, type: 'Asset' } as AccountInput,
     period = { current: false, day: undefined, month: 1, openEnded: false, year: 2024 } as MonthlyPeriod,
     monthly = { credit_card_account_id: creditCardAccount.id, id: randomUUID(), neon_account_id: neonAccount.id, neon_transactions: [], period, project_id: project.id, remaining_account_id: remainingAccount.id, shared_account_id: sharedAccount.id, shared_transactions: [], state: 'FINISHED' } as MonthlyInput,
     closing = { capital_account_id: sharedAccount.id, date: '2024-01-31', id: randomUUID(), profit: 1000, profit_account_id: creditCardAccount.id, project_id: project.id }

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
      accounts: expect.arrayContaining([expect.objectContaining(neonAccount), expect.objectContaining(sharedAccount), expect.objectContaining(creditCardAccount)]) as Account[],
      lastTransactionNeonAccount: undefined,
      lastTransactionSharedAccount: undefined,
      latestClosing: expect.objectContaining({ id: closing.id }) as Closing,
      monthly: expect.objectContaining({ id: monthly.id, state: 'FINISHED' }) as Monthly,
      transactionsNeonAccount: [],
      transactionsSharedAccount: [],
      type: 'FINISHED',
    })
  })
})
