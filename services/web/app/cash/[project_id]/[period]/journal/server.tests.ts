/* oxlint-disable typescript/no-explicit-any */
/* oxlint-disable typescript/no-unsafe-assignment */
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { deleteTransaction, loadAccountJournal, loadJournal, saveTransaction } from './server'
import type { ProjectInput } from '@/app/cash/_data/Project';
import { createOrModifyProject } from '@/app/cash/_data/Project'
import type { AccountInput} from '@/app/cash/_data/Account';
import { createOrModifyAccount } from '@/app/cash/_data/Account'
import { createTransaction } from '@/app/cash/_data/Transaction'
import type { UserSession } from '@/app/shared/auth/session'
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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    const result = await loadAccountJournal({ current: true, month: 5, year: 2023 }, project.id, account.id)

    expect(result.accounts).toEqual([expect.objectContaining(account)])
    expect(result.transactions).toEqual([])
    expect(result.account).toEqual(expect.objectContaining(account))
    expect(result.lastTransaction).toBeUndefined()
  })

  test('Journal with accounts and transactions', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'A1', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'A2', project_id: project.id, type: 'Income' } as AccountInput,
     account3 = { archived: false, id: randomUUID(), name: 'A3', project_id: project.id, type: 'Expense' } as AccountInput,
     transaction1 = { amount: 100.50, credit_account_id: account1.id, date: '2023-05-15', debit_account_id: account2.id, description: 'Test transaction', id: randomUUID(), project_id: project.id },
     transaction2 = { amount: 50.25, credit_account_id: account1.id, date: '2023-06-20', debit_account_id: account2.id, description: 'Second transaction', id: randomUUID(), project_id: project.id },
     beforeDateTransaction = { amount: 300.00, credit_account_id: account1.id, date: '2022-05-01', debit_account_id: account2.id, description: 'Before date transaction', id: randomUUID(), project_id: project.id }
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
      expect.objectContaining({ amount: -50.25, date: transaction2.date, total_balance: -450.75, transaction_id: transaction2.id }),
      expect.objectContaining({ amount: -100.50, date: transaction1.date, total_balance: -400.50, transaction_id: transaction1.id }),
    ])
    expect(result.lastTransaction).toEqual(expect.objectContaining({ amount: -300.00, date: beforeDateTransaction.date, total_balance: -300.00, transaction_id: beforeDateTransaction.id }))
    expect(result.account).toEqual(expect.objectContaining(account1))
  })

  test('Filter transactions by period', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'A1', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'A2', project_id: project.id, type: 'Income' } as AccountInput,
     account3 = { archived: false, id: randomUUID(), name: 'A3', project_id: project.id, type: 'Expense' } as AccountInput,
     transaction1 = { amount: 100.50, credit_account_id: account1.id, date: '2023-05-15', debit_account_id: account2.id, description: 'Test transaction', id: randomUUID(), project_id: project.id },
     transaction2 = { amount: 50.25, credit_account_id: account1.id, date: '2023-06-20', debit_account_id: account2.id, description: 'Second transaction', id: randomUUID(), project_id: project.id },
     beforeDateTransaction = { amount: 300.00, credit_account_id: account1.id, date: '2022-05-01', debit_account_id: account2.id, description: 'Before date transaction', id: randomUUID(), project_id: project.id }
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

    const result = await loadAccountJournal({ current: true, month: 6, year: 2023 }, project.id, account1.id)

    expect(result.accounts).toHaveLength(3)
    expect(result.transactions).toEqual([
      expect.objectContaining({ amount: -50.25, date: transaction2.date, total_balance: -150.75, transaction_id: transaction2.id }),
    ])
    expect(result.lastTransaction).toEqual(expect.objectContaining({ amount: -100.50, date: transaction1.date, total_balance: -100.50, transaction_id: transaction1.id }))
    expect(result.account).toEqual(expect.objectContaining(account1))
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    await expect(loadAccountJournal({ current: true, month: 7, year: 2023 }, randomUUID(), account.id)).rejects.toThrow()
  })

  test('Non-existent account returns notFound', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account)
    })

    await expect(loadAccountJournal({ current: true, month: 7, year: 2023 }, project.id, randomUUID())).rejects.toThrow()
  })
})

describe('loadJournal', () => {
  test('Empty journal', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id }
    await transactional(tx => createOrModifyProject(tx, project))

    const result = await loadJournal({ current: true, month: 5, year: 2023 }, project.id)

    expect(result.accounts).toEqual([])
    expect(result.transactions).toEqual([])
  })

  test('Journal with accounts and transactions', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 100.50, credit_account_id: account2.id, date: '2023-05-15', debit_account_id: account1.id, description: 'Test transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const result = await loadJournal({ current: true, month: 5, year: 2023 }, project.id)

    expect(result.accounts).toHaveLength(2)
    expect(result.accounts.map(a => a.name).sort()).toEqual(['Cash', 'Revenue'])
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toEqual(expect.objectContaining(transaction))
  })

  test('Filter transactions by period', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction1 = { amount: 100.50, credit_account_id: account2.id, date: '2023-05-15', debit_account_id: account1.id, description: 'May transaction', id: randomUUID(), project_id: project.id },
     transaction2 = { amount: 200.75, credit_account_id: account2.id, date: '2023-06-20', debit_account_id: account1.id, description: 'June transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction1)
      await createTransaction(tx, task.id, transaction2)
    })

    const resultMay = await loadJournal({ current: true, month: 5, year: 2023 }, project.id),
     resultJune = await loadJournal({ current: true, month: 6, year: 2023 }, project.id)

    expect(resultMay.transactions).toHaveLength(1)
    expect(resultMay.transactions[0].description).toEqual('May transaction')
    expect(resultJune.transactions).toHaveLength(1)
    expect(resultJune.transactions[0].description).toEqual('June transaction')
  })

  test('Non-existent project returns notFound', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const projectId = randomUUID()

    await expect(loadJournal({ current: true, month: 7, year: 2023 }, projectId)).rejects.toThrow()
  })
})

describe('saveTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Create new transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id },
     result = await saveTransaction(transactionInput)

    if (!result.success) {throw new Error(`Expected success response but got error: ${  result.error}`)}
    expect(result.data).toEqual(expect.objectContaining(transactionInput))
    expect(result.data.owner_email).toEqual(task.id)
  })

  test('Update existing transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' },
     result = await saveTransaction(updatedTransaction)

    if (!result.success) {throw new Error(`Expected success response but got error: ${  result.error}`)}
    expect(result.data).toEqual(expect.objectContaining(updatedTransaction))
    expect(result.data.owner_email).toEqual(task.id)
  })

  test('Update existing transaction for other users', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id } as ProjectInput,
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const otherUser: UserSession = { ...user, email: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await expect(saveTransaction(updatedTransaction)).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Create transaction in project of other users', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const otherUser: UserSession = { ...user, email: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const transactionInput = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await expect(saveTransaction(transactionInput)).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await expect(saveTransaction({ ...transactionInput, id: '' })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, project_id: '' })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, project_id: randomUUID() })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, credit_account_id: '' })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, credit_account_id: randomUUID() })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, debit_account_id: '' })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, debit_account_id: randomUUID() })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, amount: undefined as any })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, date: undefined as any })).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(saveTransaction({ ...transactionInput, description: '' })).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Modify transaction in closed period', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id },
     closing = { capital_account_id: account1.id, date: '2023-07-31', id: randomUUID(), profit: 0, profit_account_id: account2.id, project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
      await createClosing(tx, task.id, closing)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await expect(saveTransaction(updatedTransaction)).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Create transaction in closed period', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     closing = { capital_account_id: account1.id, date: '2023-07-31', id: randomUUID(), profit: 0, profit_account_id: account2.id, project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createClosing(tx, task.id, closing)
    })

    const transactionInput = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await expect(saveTransaction(transactionInput)).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Create account transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await saveTransaction(transactionInput)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, account1.id, { month: 8, openEnded: true, year: 2023 }))

    expect(result).toEqual({
      account_id: account1.id,
      amount: transactionInput.amount,
      created_at: expect.any(String),
      date: transactionInput.date,
      description: transactionInput.description,
      id: expect.any(String),
      ordering: expect.any(Number),
      other_account_id: account2.id,
      owner_email: task.id,
      project_id: project.id,
      total_balance: transactionInput.amount,
      transaction_id: transactionInput.id,
      updated_at: expect.any(String),
    })
  })

  test('Update existing account transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const updatedTransaction = { ...transaction, amount: 200.00, description: 'Updated' }
    await saveTransaction(updatedTransaction)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, account2.id, { month: 8, openEnded: true, year: 2023 }))

    expect(result).toEqual({
      account_id: account2.id,
      amount: -updatedTransaction.amount,
      created_at: expect.any(String),
      date: updatedTransaction.date,
      description: updatedTransaction.description,
      id: expect.any(String),
      ordering: expect.any(Number),
      other_account_id: account1.id,
      owner_email: task.id,
      project_id: project.id,
      total_balance: -updatedTransaction.amount,
      transaction_id: updatedTransaction.id,
      updated_at: expect.any(String),
    })
  })
})

describe('deleteTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Delete existing transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'Transaction to delete', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const result = await deleteTransaction(transaction.id)

    if (!result.success) {throw new Error(`Expected success response: ${  result.error}`)}

    // Verify transaction is deleted
    const journal = await loadJournal({ current: true, month: 7, year: 2023 }, project.id)
    expect(journal.transactions).toHaveLength(0)
  })

  test('Delete transaction for other users', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'Transaction to delete', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    const otherUser: UserSession = { ...user, email: 'other-user-id' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await deleteTransaction(transaction.id)

    if (!result.success) {throw new Error('Expected success response')}

    // Verify transaction is not deleted
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const journal = await loadJournal({ current: true, month: 7, year: 2023 }, project.id)
    expect(journal.transactions).toHaveLength(1)
  })

  test('Delete non-existent transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id }
    await transactional(tx => createOrModifyProject(tx, project))

    const nonExistentTransaction = { amount: 150.25, credit_account_id: randomUUID(), date: '2023-07-10', debit_account_id: randomUUID(), description: 'Does not exist', id: randomUUID(), project_id: project.id }
    await expect(deleteTransaction(nonExistentTransaction.id)).resolves.toEqual({ success: true })
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    await expect(deleteTransaction('')).resolves.toEqual({ error: expect.any(String) as string, success: false })
    await expect(deleteTransaction('invalid-uuid')).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Delete transaction in closed period', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id },
     closing = { capital_account_id: account1.id, date: '2023-07-31', id: randomUUID(), profit: 0, profit_account_id: account2.id, project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
      await createClosing(tx, task.id, closing)
    })

    await expect(deleteTransaction(transaction.id)).resolves.toEqual({ error: expect.any(String) as string, success: false })
  })

  test('Delete account transaction', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    const transactionInput = { amount: 150.25, credit_account_id: account2.id, date: '2023-07-10', debit_account_id: account1.id, description: 'New transaction', id: randomUUID(), project_id: project.id }
    await saveTransaction(transactionInput)
    await deleteTransaction(transactionInput.id)

    const result = await nontransactional(c => findLatestAccountTransactionBefore(c, task.id, account1.id, { month: 8, openEnded: true, year: 2023 }))

    expect(result).toBeUndefined()
  })
})
