import { describe, expect, test, vi } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { close, loadReports, reopen } from './server'
import type { ProjectInput } from '@/app/cash/_data/Project';
import { createOrModifyProject } from '@/app/cash/_data/Project'
import type { AccountInput} from '@/app/cash/_data/Account';
import { createOrModifyAccount } from '@/app/cash/_data/Account'
import { createTransaction } from '@/app/cash/_data/Transaction'
import { createClosing, findAllClosingsByAccount, findLastClosing } from '@/app/cash/_data/Closing'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import type { Period } from '@/app/cash/_helper/Period';
import { all } from '@/app/cash/_helper/Period'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'
import { findLatestAccountTransactionsIn } from '@/app/cash/_data/AccountTransaction'

// Mock the auth module
vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadReports', () => {
  test('Empty reports', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadReports({ month: 5, year: 2023 }, project.id)

    expect(result.accounts).toEqual([])
    expect(result.latestClosing).toBeUndefined()
    expect(result.beforeTransactions).toEqual([])
    expect(result.currentTransactions).toEqual([])
  })

  test('Reports with accounts, closing, and transactions', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const period: Period = { month: 5, year: 2023 },
     project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'A Asset', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'B Income', project_id: project.id, type: 'Income' } as AccountInput,
     account3 = { archived: false, id: randomUUID(), name: 'C Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     account4 = { archived: false, id: randomUUID(), name: 'D Equity', project_id: project.id, type: 'Equity' } as AccountInput,
     closing1 = { capital_account_id: account4.id, date: '2023-04-30', id: randomUUID(), profit: 50, profit_account_id: account3.id, project_id: project.id },
     closing2 = { capital_account_id: account4.id, date: '2023-05-31', id: randomUUID(), profit: 125, profit_account_id: account3.id, project_id: project.id },
     beforeTransaction = { amount: 100, credit_account_id: account2.id, date: '2023-04-10', debit_account_id: account1.id, description: 'Before period A1', id: randomUUID(), project_id: project.id },
     inTransactionEarly = { amount: 200, credit_account_id: account2.id, date: '2023-05-05', debit_account_id: account1.id, description: 'In period early A1', id: randomUUID(), project_id: project.id },
     inTransactionLate = { amount: 300, credit_account_id: account2.id, date: '2023-06-25', debit_account_id: account1.id, description: 'In period late A1', id: randomUUID(), project_id: project.id },
     beforeTransactionA2 = { amount: 50, credit_account_id: account1.id, date: '2023-04-20', debit_account_id: account2.id, description: 'Before period A2', id: randomUUID(), project_id: project.id },
     inTransactionA2 = { amount: 75, credit_account_id: account1.id, date: '2023-05-12', debit_account_id: account2.id, description: 'In period A2', id: randomUUID(), project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createOrModifyAccount(tx, task.id, account3)
      await createOrModifyAccount(tx, task.id, account4)
      await createClosing(tx, task.id, closing1)
      await createClosing(tx, task.id, closing2)
      await createTransaction(tx, task.id, beforeTransaction)
      await createTransaction(tx, task.id, inTransactionEarly)
      await createTransaction(tx, task.id, inTransactionLate)
      await createTransaction(tx, task.id, beforeTransactionA2)
      await createTransaction(tx, task.id, inTransactionA2)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [account1.id, account2.id, account3.id, account4.id])
    })

    const result = await loadReports(period, project.id)

    expect(result.accounts).toHaveLength(4)
    expect(result.accounts).toEqual([expect.objectContaining(account1), expect.objectContaining(account2), expect.objectContaining(account3), expect.objectContaining(account4)])
    expect(result.latestClosing).toEqual(expect.objectContaining(closing2))

    expect(result.beforeTransactions).toHaveLength(4)
    const beforeA1 = result.beforeTransactions.find(t => t.account_id === account1.id),
     beforeA2 = result.beforeTransactions.find(t => t.account_id === account2.id),
     beforeA3 = result.beforeTransactions.find(t => t.account_id === account3.id),
     beforeA4 = result.beforeTransactions.find(t => t.account_id === account4.id)
    expect(beforeA1).toEqual(expect.objectContaining({ date: beforeTransactionA2.date, total_balance: 50, transaction_id: beforeTransactionA2.id }))
    expect(beforeA2).toEqual(expect.objectContaining({ date: beforeTransactionA2.date, total_balance: -50, transaction_id: beforeTransactionA2.id }))
    expect(beforeA3).toEqual(expect.objectContaining({ date: closing1.date, total_balance: 50, transaction_id: undefined }))
    expect(beforeA4).toEqual(expect.objectContaining({ date: closing1.date, total_balance: -50, transaction_id: undefined }))

    expect(result.currentTransactions).toHaveLength(4)
    const currentA1 = result.currentTransactions.find(t => t.account_id === account1.id),
     currentA2 = result.currentTransactions.find(t => t.account_id === account2.id),
     currentA3 = result.currentTransactions.find(t => t.account_id === account3.id),
     currentA4 = result.currentTransactions.find(t => t.account_id === account4.id)
    expect(currentA1).toEqual(expect.objectContaining({ date: inTransactionA2.date, total_balance: 175, transaction_id: inTransactionA2.id }))
    expect(currentA2).toEqual(expect.objectContaining({ date: inTransactionA2.date, total_balance: -175, transaction_id: inTransactionA2.id }))
    expect(currentA3).toEqual(expect.objectContaining({ date: closing2.date, total_balance: 175, transaction_id: undefined }))
    expect(currentA4).toEqual(expect.objectContaining({ date: closing2.date, total_balance: -175, transaction_id: undefined }))
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await expect(loadReports({ month: 7, year: 2023 }, randomUUID())).rejects.toThrow()
  })

  test('Cannot load other user project', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Other User Project', owner_email: 'other-user-id' } as ProjectInput
    await transactional(tx => createOrModifyProject(tx, project))

    await expect(loadReports({ month: 5, year: 2023 }, project.id)).rejects.toThrow()
  })
})

describe('reopen', () => {
  test('reopen removes later closings and recalculates', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput,
     closingApril = { capital_account_id: capitalAccount.id, date: '2023-04-30', id: randomUUID(), profit: 10, profit_account_id: profitAccount.id, project_id: project.id },
     closingMay = { capital_account_id: capitalAccount.id, date: '2023-05-31', id: randomUUID(), profit: 20, profit_account_id: profitAccount.id, project_id: project.id },
     closingJune = { capital_account_id: capitalAccount.id, date: '2023-06-30', id: randomUUID(), profit: 30, profit_account_id: profitAccount.id, project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createClosing(tx, task.id, closingApril)
      await createClosing(tx, task.id, closingMay)
      await createClosing(tx, task.id, closingJune)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await reopen({ month: 5, year: 2023 }, project.id)

    const lastClosing = await nontransactional(tx => findLastClosing(tx, task.id, project.id))
    expect(lastClosing?.date).toBe('2023-04-30')
    const juneClosing = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, { month: 6, year: 2023 }))
    expect(juneClosing).toEqual([])
    const juneTransactions = await nontransactional(tx => findLatestAccountTransactionsIn(tx, project.id, task.id, { month: 6, year: 2023 }))
    expect(juneTransactions).toEqual([])
  })

  test('reopen already opened period does nothing', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput,
     closingJune = { capital_account_id: capitalAccount.id, date: '2023-06-30', id: randomUUID(), profit: 30, profit_account_id: profitAccount.id, project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createClosing(tx, task.id, closingJune)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await reopen({ month: 7, year: 2023 }, project.id)

    const lastClosing = await nontransactional(tx => findLastClosing(tx, task.id, project.id))
    expect(lastClosing?.date).toBe('2023-06-30')
  })

  test('reopen before first closing reopens everything', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput,
     closingApril = { capital_account_id: capitalAccount.id, date: '2023-04-30', id: randomUUID(), profit: 10, profit_account_id: profitAccount.id, project_id: project.id },
     closingMay = { capital_account_id: capitalAccount.id, date: '2023-05-31', id: randomUUID(), profit: 20, profit_account_id: profitAccount.id, project_id: project.id },
     closingJune = { capital_account_id: capitalAccount.id, date: '2023-06-30', id: randomUUID(), profit: 30, profit_account_id: profitAccount.id, project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createClosing(tx, task.id, closingApril)
      await createClosing(tx, task.id, closingMay)
      await createClosing(tx, task.id, closingJune)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await reopen({ month: 1, year: 2023 }, project.id)

    const lastClosing = await nontransactional(tx => findLastClosing(tx, task.id, project.id))
    expect(lastClosing).toBeUndefined()
  })
})

describe('close', () => {
  test('close creates closings for all periods since last closing', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput,
     newCapitalAccount = { archived: false, id: randomUUID(), name: 'Capital 2', project_id: project.id, type: 'Equity' } as AccountInput,
     closingApril = { capital_account_id: capitalAccount.id, date: '2023-04-30', id: randomUUID(), profit: 10, profit_account_id: profitAccount.id, project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createOrModifyAccount(tx, task.id, newCapitalAccount)
      await createClosing(tx, task.id, closingApril)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await close({ month: 7, year: 2023 }, project.id, profitAccount.id, newCapitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining(closingApril),
      expect.objectContaining({ capital_account_id: newCapitalAccount.id, date: '2023-05-31', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: newCapitalAccount.id, date: '2023-06-30', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: newCapitalAccount.id, date: '2023-07-31', profit: 0, profit_account_id: profitAccount.id }),
    ])
  })

  test('close creates closings since first transaction when first closing', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput,
     transaction = { amount: 100, credit_account_id: profitAccount.id, date: '2023-02-15', debit_account_id: capitalAccount.id, description: 'First transaction', id: randomUUID(), project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createTransaction(tx, task.id, transaction)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await close({ month: 7, year: 2023 }, project.id, profitAccount.id, capitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-02-28', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-03-31', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-04-30', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-05-31', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-06-30', profit: 0, profit_account_id: profitAccount.id }),
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-07-31', profit: 0, profit_account_id: profitAccount.id }),
    ])
  })

  test('close creates one closings when first closing and no transactions', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await close({ month: 7, year: 2023 }, project.id, profitAccount.id, capitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-07-31', profit: 0, profit_account_id: profitAccount.id }),
    ])
  })

  test('close computes profit and creates transactions correctly', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Reopen Project', owner_email: task.id } as ProjectInput,
     profitAccount = { archived: false, id: randomUUID(), name: 'Profit', project_id: project.id, type: 'Profit' } as AccountInput,
     capitalAccount = { archived: false, id: randomUUID(), name: 'Capital', project_id: project.id, type: 'Equity' } as AccountInput,
     incomeAccount = { archived: false, id: randomUUID(), name: 'Income', project_id: project.id, type: 'Income' } as AccountInput,
     expenseAccount = { archived: false, id: randomUUID(), name: 'Spending', project_id: project.id, type: 'Expense' } as AccountInput,
     activeAccount = { archived: false, id: randomUUID(), name: 'Active', project_id: project.id, type: 'Asset' } as AccountInput,
     transaction1 = { amount: 1000, credit_account_id: capitalAccount.id, date: '2023-01-01', debit_account_id: activeAccount.id, description: 'Opening', id: randomUUID(), project_id: project.id },
     transaction2 = { amount: 100, credit_account_id: activeAccount.id, date: '2023-01-10', debit_account_id: expenseAccount.id, description: 'An expense', id: randomUUID(), project_id: project.id },
     transaction3 = { amount: 500, credit_account_id: incomeAccount.id, date: '2023-01-20', debit_account_id: activeAccount.id, description: 'Salary', id: randomUUID(), project_id: project.id },
     transaction4 = { amount: 200, credit_account_id: incomeAccount.id, date: '2023-02-10', debit_account_id: activeAccount.id, description: 'An income', id: randomUUID(), project_id: project.id },
     transaction5 = { amount: 50, credit_account_id: activeAccount.id, date: '2023-02-15', debit_account_id: expenseAccount.id, description: 'Another expense', id: randomUUID(), project_id: project.id },
     closingJan = { capital_account_id: capitalAccount.id, date: '2023-01-31', id: randomUUID(), profit: 600, profit_account_id: profitAccount.id, project_id: project.id }

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createOrModifyAccount(tx, task.id, incomeAccount)
      await createOrModifyAccount(tx, task.id, expenseAccount)
      await createOrModifyAccount(tx, task.id, activeAccount)
      await createTransaction(tx, task.id, transaction1)
      await createTransaction(tx, task.id, transaction2)
      await createTransaction(tx, task.id, transaction3)
      await createTransaction(tx, task.id, transaction4)
      await createTransaction(tx, task.id, transaction5)
      await createClosing(tx, task.id, closingJan)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id, incomeAccount.id, expenseAccount.id, activeAccount.id])
    })

    await close({ month: 2, year: 2023 }, project.id, profitAccount.id, capitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining(closingJan),
      expect.objectContaining({ capital_account_id: capitalAccount.id, date: '2023-02-28', profit: 150, profit_account_id: profitAccount.id }),
    ])
  })
})
