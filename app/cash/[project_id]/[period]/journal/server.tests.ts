/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/db'
import { v4 as randomUUID } from 'uuid'
import { loadJournal, saveTransaction, deleteTransaction } from './server'
import { createOrModifyProject } from '@/app/cash/_data/Project'
import { AccountInput, createOrModifyAccount } from '@/app/cash/_data/Account'
import { createTransaction } from '@/app/cash/_data/Transaction'
import { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createClosing } from '@/app/cash/_data/Closing'
import { findLatestAccountTransactionBefore } from '@/app/cash/_data/AccountTransaction'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadJournal', () => {
  test('Empty journal', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadJournal({ current: true, year: 2023, month: 5 }, project.id)

    expect(result.project).toEqual(expect.objectContaining(project))
    expect(result.accounts).toEqual([])
    expect(result.transactions).toEqual([])
  })

  test('Journal with accounts and transactions', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100.50, date: new Date('2023-05-15'), description: 'Test transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const result = await loadJournal({ current: true, year: 2023, month: 5 }, project.id)

    expect(result.project).toEqual(expect.objectContaining(project))
    expect(result.accounts).toHaveLength(2)
    expect(result.accounts.map(a => a.name).sort()).toEqual(['Cash', 'Revenue'])
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toEqual(expect.objectContaining(transaction))
  })

  test('Filter transactions by period', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction1 = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100.50, date: new Date('2023-05-15'), description: 'May transaction' }
    const transaction2 = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 200.75, date: new Date('2023-06-20'), description: 'June transaction' }
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
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
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
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    const result = await saveTransaction(transactionInput)

    if (!result.success) throw new Error('Expected success response but got error: ' + result.error)
    expect(result.data).toEqual(expect.objectContaining(transactionInput))
    expect(result.data.owner_id).toEqual(task.id)
  })

  test('Update existing transaction', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    const result = await saveTransaction(updatedTransaction)

    if (!result.success) throw new Error('Expected success response')
    expect(result.data).toEqual(expect.objectContaining(updatedTransaction))
    expect(result.data.owner_id).toEqual(task.id)
  })

  test('Update existing transaction for other users', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const otherUser: UserSession = { ...user, sub: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await expect(saveTransaction(updatedTransaction)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Create transaction in project of other users', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const otherUser: UserSession = { ...user, sub: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await expect(saveTransaction(transactionInput)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
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
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    const closing = { id: randomUUID(), project_id: project.id, date: new Date('2023-07-31'), capital_account_id: account1.id, profit_account_id: account2.id, profit: 0 }
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
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const closing = { id: randomUUID(), project_id: project.id, date: new Date('2023-07-31'), capital_account_id: account1.id, profit_account_id: account2.id, profit: 0 }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createClosing(tx, task.id, closing)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await expect(saveTransaction(transactionInput)).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })

  test('Create account transaction', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await saveTransaction(transactionInput)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, project.id, account1.id, { year: 2023, month: 8, openEnded: true }))

    expect(result).toEqual({
      id: expect.any(String),
      project_id: project.id,
      owner_id: task.id,
      ordering: expect.any(Number),
      account_id: account1.id,
      other_account_id: account2.id,
      amount: transactionInput.amount,
      total_balance: transactionInput.amount,
      date: transactionInput.date,
      transaction_id: transactionInput.id,
      description: transactionInput.description,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    })
  })

  test('Update existing account transaction', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await saveTransaction(updatedTransaction)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, project.id, account2.id, { year: 2023, month: 8, openEnded: true }))

    expect(result).toEqual({
      id: expect.any(String),
      project_id: project.id,
      owner_id: task.id,
      ordering: expect.any(Number),
      account_id: account2.id,
      other_account_id: account1.id,
      amount: -updatedTransaction.amount,
      total_balance: -updatedTransaction.amount,
      date: updatedTransaction.date,
      transaction_id: updatedTransaction.id,
      description: updatedTransaction.description,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    })
  })
})

describe('deleteTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Delete existing transaction', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'Transaction to delete' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const result = await deleteTransaction(transaction.id)

    if (!result.success) throw new Error('Expected success response')

    // Verify transaction is deleted
    const journal = await loadJournal({ current: true, year: 2023, month: 7 }, project.id)
    expect(journal.transactions).toHaveLength(0)
  })

  test('Delete transaction for other users', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'Transaction to delete' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const otherUser: UserSession = { ...user, sub: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await deleteTransaction(transaction.id)

    if (!result.success) throw new Error('Expected success response')

    // Verify transaction is not deleted
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const journal = await loadJournal({ current: true, year: 2023, month: 7 }, project.id)
    expect(journal.transactions).toHaveLength(1)
  })

  test('Delete non-existent transaction', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    await transactional(tx => createOrModifyProject(tx, project))

    const nonExistentTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: randomUUID(), debit_account_id: randomUUID(), amount: 150.25, date: new Date('2023-07-10'), description: 'Does not exist' }
    await expect(deleteTransaction(nonExistentTransaction.id)).resolves.toEqual({ success: true })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
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
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    const closing = { id: randomUUID(), project_id: project.id, date: new Date('2023-07-31'), capital_account_id: account1.id, profit_account_id: account2.id, profit: 0 }
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
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 150.25, date: new Date('2023-07-10'), description: 'New transaction' }
    await saveTransaction(transactionInput)
    await deleteTransaction(transactionInput.id)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, project.id, account1.id, { year: 2023, month: 8, openEnded: true }))

    expect(result).toBeUndefined()
  })
})
