/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { loadJournal, saveTransaction, deleteTransaction, loadAccountJournal } from './server'
import { createOrModifyProject, ProjectInput } from '@/app/cash/_data/Project'
import { AccountInput, createOrModifyAccount } from '@/app/cash/_data/Account'
import { createTransaction } from '@/app/cash/_data/Transaction'
import { UserSession } from '@/app/shared/auth/auth'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { createClosing } from '@/app/cash/_data/Closing'
import { findLatestAccountTransactionBefore } from '@/app/cash/_data/AccountTransaction'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'

// Mock the auth module
vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadAccountJournal', () => {
  test('Empty journal', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const result = await loadAccountJournal({ current: true, year: 2023, month: 5 }, project.id, account.id)

    expect(result.accounts).toEqual([expect.objectContaining(account)])
    expect(result.transactions).toEqual([])
    expect(result.account).toEqual(expect.objectContaining(account))
    expect(result.lastTransaction).toBeUndefined()
  })

  test('Journal with accounts and transactions', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'A1', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'A2', type: 'Income', archived: false } as AccountInput
    const account3 = { id: randomUUID(), project_id: project.id, name: 'A3', type: 'Expense', archived: false } as AccountInput
    const transaction1 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    const transaction2 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 50.25, date: '2023-06-20', description: 'Second transaction' }
    const beforeDateTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 300.00, date: '2022-05-01', description: 'Before date transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createOrModifyAccount(tx, task.id, account3)
      await createTransaction(tx, task.id, transaction1)
      await createTransaction(tx, task.id, transaction2)
      await createTransaction(tx, task.id, beforeDateTransaction)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2022-01-01'), [account1.id, account2.id, account3.id])
    })

    const result = await loadAccountJournal({ current: true, year: 2023 }, project.id, account1.id)

    expect(result.accounts).toHaveLength(3)
    expect(result.transactions).toEqual([
      expect.objectContaining({ amount: -50.25, total_balance: -450.75, date: transaction2.date, transaction_id: transaction2.id }),
      expect.objectContaining({ amount: -100.50, total_balance: -400.50, date: transaction1.date, transaction_id: transaction1.id }),
    ])
    expect(result.lastTransaction).toEqual(expect.objectContaining({ amount: -300.00, total_balance: -300.00, date: beforeDateTransaction.date, transaction_id: beforeDateTransaction.id }))
    expect(result.account).toEqual(expect.objectContaining(account1))
  })

  test('Filter transactions by period', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'A1', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'A2', type: 'Income', archived: false } as AccountInput
    const account3 = { id: randomUUID(), project_id: project.id, name: 'A3', type: 'Expense', archived: false } as AccountInput
    const transaction1 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    const transaction2 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 50.25, date: '2023-06-20', description: 'Second transaction' }
    const beforeDateTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 300.00, date: '2022-05-01', description: 'Before date transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createOrModifyAccount(tx, task.id, account3)
      await createTransaction(tx, task.id, transaction1)
      await createTransaction(tx, task.id, transaction2)
      await createTransaction(tx, task.id, beforeDateTransaction)
      await recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-05-01'), [account1.id, account2.id, account3.id])
    })

    const result = await loadAccountJournal({ current: true, year: 2023, month: 6 }, project.id, account1.id)

    expect(result.accounts).toHaveLength(3)
    expect(result.transactions).toEqual([
      expect.objectContaining({ amount: -50.25, total_balance: -150.75, date: transaction2.date, transaction_id: transaction2.id }),
    ])
    expect(result.lastTransaction).toEqual(expect.objectContaining({ amount: -100.50, total_balance: -100.50, date: transaction1.date, transaction_id: transaction1.id }))
    expect(result.account).toEqual(expect.objectContaining(account1))
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    await expect(loadAccountJournal({ current: true, year: 2023, month: 7 }, randomUUID(), account.id)).rejects.toThrow()
  })

  test('Non-existent account returns notFound', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    await expect(loadAccountJournal({ current: true, year: 2023, month: 7 }, project.id, randomUUID())).rejects.toThrow()
  })
})

describe('loadJournal', () => {
  test('Empty journal', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadJournal({ current: true, year: 2023, month: 5 }, project.id)

    expect(result.accounts).toEqual([])
    expect(result.transactions).toEqual([])
  })

  test('Journal with accounts and transactions', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const result = await loadJournal({ current: true, year: 2023, month: 5 }, project.id)

    expect(result.accounts).toHaveLength(2)
    expect(result.accounts.map(a => a.name).sort()).toEqual(['Cash', 'Revenue'])
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toEqual(expect.objectContaining(transaction))
  })

  test('Filter transactions by period', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction1 = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100.50, date: '2023-05-15', description: 'May transaction' }
    const transaction2 = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 200.75, date: '2023-06-20', description: 'June transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction1)
      await createTransaction(tx, task.id, transaction2)
    })

    const resultMay = await loadJournal({ current: true, year: 2023, month: 5 }, project.id)
    const resultJune = await loadJournal({ current: true, year: 2023, month: 6 }, project.id)

    expect(resultMay.transactions).toHaveLength(1)
    expect(resultMay.transactions[0].description).toEqual('May transaction')
    expect(resultJune.transactions).toHaveLength(1)
    expect(resultJune.transactions[0].description).toEqual('June transaction')
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const projectId = randomUUID()

    await expect(loadJournal({ current: true, year: 2023, month: 7 }, projectId)).rejects.toThrow()
  })
})

describe('saveTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Create new transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    const result = await saveTransaction(transactionInput)

    if (!result.success) throw new Error('Expected success response but got error: ' + result.error)
    expect(result.data).toEqual(expect.objectContaining(transactionInput))
    expect(result.data.owner_email).toEqual(task.id)
  })

  test('Update existing transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    const result = await saveTransaction(updatedTransaction)

    if (!result.success) throw new Error('Expected success response but got error: ' + result.error)
    expect(result.data).toEqual(expect.objectContaining(updatedTransaction))
    expect(result.data.owner_email).toEqual(task.id)
  })

  test('Update existing transaction for other users', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false } as ProjectInput
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const otherUser: UserSession = { ...user, email: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await expect(saveTransaction(updatedTransaction)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Create transaction in project of other users', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const otherUser: UserSession = { ...user, email: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await expect(saveTransaction(transactionInput)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await expect(saveTransaction({ ...transactionInput, id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, project_id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, project_id: randomUUID() })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, credit_account_id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, credit_account_id: randomUUID() })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, debit_account_id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, debit_account_id: randomUUID() })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, amount: undefined as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, date: undefined as any })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTransaction({ ...transactionInput, description: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Modify transaction in closed period', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    const closing = { id: randomUUID(), project_id: project.id, date: '2023-07-31', capital_account_id: account1.id, profit_account_id: account2.id, profit: 0 }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
      await createClosing(tx, task.id, closing)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await expect(saveTransaction(updatedTransaction)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Create transaction in closed period', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const closing = { id: randomUUID(), project_id: project.id, date: '2023-07-31', capital_account_id: account1.id, profit_account_id: account2.id, profit: 0 }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createClosing(tx, task.id, closing)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await expect(saveTransaction(transactionInput)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Create account transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await saveTransaction(transactionInput)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, account1.id, { year: 2023, month: 8, openEnded: true }))

    expect(result).toEqual({
      id: expect.any(String),
      owner_email: task.id,
      ordering: expect.any(Number),
      account_id: account1.id,
      other_account_id: account2.id,
      amount: transactionInput.amount,
      total_balance: transactionInput.amount,
      date: transactionInput.date,
      transaction_id: transactionInput.id,
      description: transactionInput.description,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      project_id: project.id,
    })
  })

  test('Update existing account transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await saveTransaction(updatedTransaction)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, account2.id, { year: 2023, month: 8, openEnded: true }))

    expect(result).toEqual({
      id: expect.any(String),
      owner_email: task.id,
      ordering: expect.any(Number),
      account_id: account2.id,
      other_account_id: account1.id,
      amount: -updatedTransaction.amount,
      total_balance: -updatedTransaction.amount,
      date: updatedTransaction.date,
      transaction_id: updatedTransaction.id,
      description: updatedTransaction.description,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      project_id: project.id,
    })
  })
})

describe('deleteTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Delete existing transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'Transaction to delete' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const result = await deleteTransaction(transaction.id)

    if (!result.success) throw new Error('Expected success response: ' + result.error)

    // Verify transaction is deleted
    const journal = await loadJournal({ current: true, year: 2023, month: 7 }, project.id)
    expect(journal.transactions).toHaveLength(0)
  })

  test('Delete transaction for other users', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'Transaction to delete' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const otherUser: UserSession = { ...user, email: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await deleteTransaction(transaction.id)

    if (!result.success) throw new Error('Expected success response')

    // Verify transaction is not deleted
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const journal = await loadJournal({ current: true, year: 2023, month: 7 }, project.id)
    expect(journal.transactions).toHaveLength(1)
  })

  test('Delete non-existent transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const nonExistentTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: randomUUID(), debit_account_id: randomUUID(), amount: 150.25, date: '2023-07-10', description: 'Does not exist' }
    await expect(deleteTransaction(nonExistentTransaction.id)).resolves.toEqual({ success: true })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    await expect(deleteTransaction('')).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(deleteTransaction('invalid-uuid')).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Delete transaction in closed period', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    const closing = { id: randomUUID(), project_id: project.id, date: '2023-07-31', capital_account_id: account1.id, profit_account_id: account2.id, profit: 0 }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
      await createClosing(tx, task.id, closing)
    })

    await expect(deleteTransaction(transaction.id)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Delete account transaction', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_email: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: '2023-07-10', description: 'New transaction' }
    await saveTransaction(transactionInput)
    await deleteTransaction(transactionInput.id)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, account1.id, { year: 2023, month: 8, openEnded: true }))

    expect(result).toBeUndefined()
  })
})
