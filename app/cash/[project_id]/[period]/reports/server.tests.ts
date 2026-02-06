import { describe, expect, test, vi } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { close, loadReports, reopen } from './server'
import { createOrModifyProject, ProjectInput } from '@/app/cash/_data/Project'
import { AccountInput, createOrModifyAccount } from '@/app/cash/_data/Account'
import { createTransaction, TransactionInput } from '@/app/cash/_data/Transaction'
import { ClosingInput, createClosing, findAllClosingsByAccount, findLastClosing } from '@/app/cash/_data/Closing'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { all, Period } from '@/app/cash/_helper/Period'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'
import { findLatestAccountTransactionsIn } from '@/app/cash/_data/AccountTransaction'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadReports', () => {
  test('Empty reports', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadReports({ year: 2023, month: 5 }, project.id)

    expect(result.accounts).toEqual([])
    expect(result.latestClosing).toBeUndefined()
    expect(result.beforeTransactions).toEqual([])
    expect(result.currentTransactions).toEqual([])
  })

  test('Reports with accounts, closing, and transactions', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const period: Period = { year: 2023, month: 5 }
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'A Asset', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'B Income', type: 'Income', archived: false } as AccountInput
    const account3 = { id: randomUUID(), project_id: project.id, name: 'C Profit', type: 'Profit', archived: false } as AccountInput
    const account4 = { id: randomUUID(), project_id: project.id, name: 'D Equity', type: 'Equity', archived: false } as AccountInput
    const closing1 = { id: randomUUID(), project_id: project.id, date: '2023-04-30', capital_account_id: account4.id, profit_account_id: account3.id, profit: 50 } as ClosingInput
    const closing2 = { id: randomUUID(), project_id: project.id, date: '2023-05-31', capital_account_id: account4.id, profit_account_id: account3.id, profit: 125 } as ClosingInput
    const beforeTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100, date: '2023-04-10', description: 'Before period A1' } as TransactionInput
    const inTransactionEarly = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 200, date: '2023-05-05', description: 'In period early A1' } as TransactionInput
    const inTransactionLate = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 300, date: '2023-06-25', description: 'In period late A1' } as TransactionInput
    const beforeTransactionA2 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 50, date: '2023-04-20', description: 'Before period A2' } as TransactionInput
    const inTransactionA2 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 75, date: '2023-05-12', description: 'In period A2' } as TransactionInput

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
    const beforeA1 = result.beforeTransactions.find(t => t.account_id === account1.id)
    const beforeA2 = result.beforeTransactions.find(t => t.account_id === account2.id)
    const beforeA3 = result.beforeTransactions.find(t => t.account_id === account3.id)
    const beforeA4 = result.beforeTransactions.find(t => t.account_id === account4.id)
    expect(beforeA1).toEqual(expect.objectContaining({ transaction_id: beforeTransactionA2.id, date: beforeTransactionA2.date, total_balance: 50 }))
    expect(beforeA2).toEqual(expect.objectContaining({ transaction_id: beforeTransactionA2.id, date: beforeTransactionA2.date, total_balance: -50 }))
    expect(beforeA3).toEqual(expect.objectContaining({ transaction_id: undefined, date: closing1.date, total_balance: 50 }))
    expect(beforeA4).toEqual(expect.objectContaining({ transaction_id: undefined, date: closing1.date, total_balance: -50 }))

    expect(result.currentTransactions).toHaveLength(4)
    const currentA1 = result.currentTransactions.find(t => t.account_id === account1.id)
    const currentA2 = result.currentTransactions.find(t => t.account_id === account2.id)
    const currentA3 = result.currentTransactions.find(t => t.account_id === account3.id)
    const currentA4 = result.currentTransactions.find(t => t.account_id === account4.id)
    expect(currentA1).toEqual(expect.objectContaining({ transaction_id: inTransactionA2.id, date: inTransactionA2.date, total_balance: 175 }))
    expect(currentA2).toEqual(expect.objectContaining({ transaction_id: inTransactionA2.id, date: inTransactionA2.date, total_balance: -175 }))
    expect(currentA3).toEqual(expect.objectContaining({ transaction_id: undefined, date: closing2.date, total_balance: 175 }))
    expect(currentA4).toEqual(expect.objectContaining({ transaction_id: undefined, date: closing2.date, total_balance: -175 }))
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await expect(loadReports({ year: 2023, month: 7 }, randomUUID())).rejects.toThrow()
  })

  test('Cannot load other user project', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Other User Project', owner_id: 'other-user-id', archived: false } as ProjectInput
    await transactional(tx => createOrModifyProject(tx, project))

    await expect(loadReports({ year: 2023, month: 5 }, project.id)).rejects.toThrow()
  })
})

describe('reopen', () => {
  test('reopen removes later closings and recalculates', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput
    const closingApril = { id: randomUUID(), project_id: project.id, date: '2023-04-30', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 10 } as ClosingInput
    const closingMay = { id: randomUUID(), project_id: project.id, date: '2023-05-31', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 20 } as ClosingInput
    const closingJune = { id: randomUUID(), project_id: project.id, date: '2023-06-30', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 30 } as ClosingInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createClosing(tx, task.id, closingApril)
      await createClosing(tx, task.id, closingMay)
      await createClosing(tx, task.id, closingJune)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await reopen({ year: 2023, month: 5 }, project.id)

    const lastClosing = await nontransactional(tx => findLastClosing(tx, task.id, project.id))
    expect(lastClosing?.date).toBe('2023-04-30')
    const juneClosing = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, { year: 2023, month: 6 }))
    expect(juneClosing).toEqual([])
    const juneTransactions = await nontransactional(tx => findLatestAccountTransactionsIn(tx, project.id, task.id, { year: 2023, month: 6 }))
    expect(juneTransactions).toEqual([])
  })

  test('reopen already opened period does nothing', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput
    const closingJune = { id: randomUUID(), project_id: project.id, date: '2023-06-30', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 30 } as ClosingInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createClosing(tx, task.id, closingJune)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await reopen({ year: 2023, month: 7 }, project.id)

    const lastClosing = await nontransactional(tx => findLastClosing(tx, task.id, project.id))
    expect(lastClosing?.date).toBe('2023-06-30')
  })

  test('reopen before first closing reopens everything', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput
    const closingApril = { id: randomUUID(), project_id: project.id, date: '2023-04-30', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 10 } as ClosingInput
    const closingMay = { id: randomUUID(), project_id: project.id, date: '2023-05-31', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 20 } as ClosingInput
    const closingJune = { id: randomUUID(), project_id: project.id, date: '2023-06-30', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 30 } as ClosingInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createClosing(tx, task.id, closingApril)
      await createClosing(tx, task.id, closingMay)
      await createClosing(tx, task.id, closingJune)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await reopen({ year: 2023, month: 1 }, project.id)

    const lastClosing = await nontransactional(tx => findLastClosing(tx, task.id, project.id))
    expect(lastClosing).toBeUndefined()
  })
})

describe('close', () => {
  test('close creates closings for all periods since last closing', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput
    const newCapitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital 2', type: 'Equity', archived: false } as AccountInput
    const closingApril = { id: randomUUID(), project_id: project.id, date: '2023-04-30', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 10 } as ClosingInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createOrModifyAccount(tx, task.id, newCapitalAccount)
      await createClosing(tx, task.id, closingApril)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await close({ year: 2023, month: 7 }, project.id, profitAccount.id, newCapitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining(closingApril),
      expect.objectContaining({ date: '2023-05-31', profit: 0, profit_account_id: profitAccount.id, capital_account_id: newCapitalAccount.id }),
      expect.objectContaining({ date: '2023-06-30', profit: 0, profit_account_id: profitAccount.id, capital_account_id: newCapitalAccount.id }),
      expect.objectContaining({ date: '2023-07-31', profit: 0, profit_account_id: profitAccount.id, capital_account_id: newCapitalAccount.id }),
    ])
  })

  test('close creates closings since first transaction when first closing', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: profitAccount.id, debit_account_id: capitalAccount.id, amount: 100, date: '2023-02-15', description: 'First transaction' } as TransactionInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await createTransaction(tx, task.id, transaction)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await close({ year: 2023, month: 7 }, project.id, profitAccount.id, capitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining({ date: '2023-02-28', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
      expect.objectContaining({ date: '2023-03-31', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
      expect.objectContaining({ date: '2023-04-30', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
      expect.objectContaining({ date: '2023-05-31', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
      expect.objectContaining({ date: '2023-06-30', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
      expect.objectContaining({ date: '2023-07-31', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
    ])
  })

  test('close creates one closings when first closing and no transactions', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, profitAccount)
      await createOrModifyAccount(tx, task.id, capitalAccount)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-01-01'), [profitAccount.id, capitalAccount.id])
    })

    await close({ year: 2023, month: 7 }, project.id, profitAccount.id, capitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining({ date: '2023-07-31', profit: 0, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
    ])
  })

  test('close computes profit and creates transactions correctly', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Reopen Project', owner_id: task.id, archived: false } as ProjectInput
    const profitAccount = { id: randomUUID(), project_id: project.id, name: 'Profit', type: 'Profit', archived: false } as AccountInput
    const capitalAccount = { id: randomUUID(), project_id: project.id, name: 'Capital', type: 'Equity', archived: false } as AccountInput
    const incomeAccount = { id: randomUUID(), project_id: project.id, name: 'Income', type: 'Income', archived: false } as AccountInput
    const expenseAccount = { id: randomUUID(), project_id: project.id, name: 'Spending', type: 'Expense', archived: false } as AccountInput
    const activeAccount = { id: randomUUID(), project_id: project.id, name: 'Active', type: 'Asset', archived: false } as AccountInput
    const transaction1 = { id: randomUUID(), project_id: project.id, credit_account_id: capitalAccount.id, debit_account_id: activeAccount.id, amount: 1000, date: '2023-01-01', description: 'Opening' } as TransactionInput
    const transaction2 = { id: randomUUID(), project_id: project.id, credit_account_id: activeAccount.id, debit_account_id: expenseAccount.id, amount: 100, date: '2023-01-10', description: 'An expense' } as TransactionInput
    const transaction3 = { id: randomUUID(), project_id: project.id, credit_account_id: activeAccount.id, debit_account_id: expenseAccount.id, amount: 500, date: '2023-01-20', description: 'Salary' } as TransactionInput
    const transaction4 = { id: randomUUID(), project_id: project.id, credit_account_id: activeAccount.id, debit_account_id: incomeAccount.id, amount: 200, date: '2023-02-10', description: 'An income' } as TransactionInput
    const transaction5 = { id: randomUUID(), project_id: project.id, credit_account_id: activeAccount.id, debit_account_id: expenseAccount.id, amount: 50, date: '2023-02-15', description: 'Another expense' } as TransactionInput
    const closingJan = { id: randomUUID(), project_id: project.id, date: '2023-01-31', capital_account_id: capitalAccount.id, profit_account_id: profitAccount.id, profit: 600 } as ClosingInput

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

    await close({ year: 2023, month: 2 }, project.id, profitAccount.id, capitalAccount.id)

    const closings = await nontransactional(tx => findAllClosingsByAccount(tx, task.id, profitAccount.id, all))
    expect(closings).toEqual([
      expect.objectContaining(closingJan),
      expect.objectContaining({ date: '2023-02-28', profit: 150, profit_account_id: profitAccount.id, capital_account_id: capitalAccount.id }),
    ])
  })
})
