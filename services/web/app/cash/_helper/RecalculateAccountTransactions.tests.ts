import { type AccountInput, createOrModifyAccount } from '../_data/Account';
import { type AccountTransactionInput, createAccountTransaction, findAllAccountTransactionsInPeriod } from '../_data/AccountTransaction'
import { describe, expect, test } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { Temporal } from '@js-temporal/polyfill'
import { createClosing } from '../_data/Closing'
import { createOrModifyProject } from '../_data/Project'
import { createTransaction } from '../_data/Transaction'
import { v4 as randomUUID } from 'uuid'
import { recalculateTransactions } from './RecalculateAccountTransactions'

describe('loadJournal', () => {
  test('No Transactions', async ({ task }) => {
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-05-01'), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { month: 5, openEnded: true, year: 2023 }))
    expect(result).toEqual([])
  })

  test('Single Transaction', async ({ task }) => {
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 100.50, credit_account_id: account2.id, date: '2023-05-15', debit_account_id: account1.id, description: 'Test transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(transaction.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { month: 5, openEnded: true, year: 2023 }))
    expect(result).toEqual([{
      account_id: account1.id,
      amount: transaction.amount,
      created_at: expect.any(String) as string,
      date: transaction.date,
      description: transaction.description,
      id: expect.any(String) as string,
      ordering: expect.any(Number) as number,
      other_account_id: account2.id,
      owner_email: task.id,
      project_id: project.id,
      total_balance: transaction.amount,
      transaction_id: transaction.id,
      updated_at: expect.any(String) as string,
    }])
  })

  test('Single Closing', async ({ task }) => {
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     closing = { capital_account_id: account1.id, date: '2023-01-31', id: randomUUID(), profit: 200.75, profit_account_id: account2.id, project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createClosing(tx, task.id, closing)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(closing.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { month: 1, openEnded: true, year: 2023 }))
    expect(result).toEqual([expect.objectContaining({
      account_id: account1.id,
      amount: -closing.profit,
      date: closing.date,
      description: 'Closing 2023-01',
      other_account_id: account2.id,
      total_balance: -closing.profit,
      transaction_id: undefined,
    })])
  })

  test('Multiple Transactions', async ({ task }) => {
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'A1', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'A2', project_id: project.id, type: 'Income' } as AccountInput,
     account3 = { archived: false, id: randomUUID(), name: 'A3', project_id: project.id, type: 'Expense' } as AccountInput,
     closing1 = { capital_account_id: account1.id, date: '2023-01-31', id: randomUUID(), profit: 200, profit_account_id: account2.id, project_id: project.id },
     closing2 = { capital_account_id: account1.id, date: '2023-05-31', id: randomUUID(), profit: -100, profit_account_id: account2.id, project_id: project.id },
     transaction1 = { amount: 100.50, credit_account_id: account1.id, date: '2023-05-15', debit_account_id: account2.id, description: 'Test transaction', id: randomUUID(), project_id: project.id },
     transaction2 = { amount: 50.25, credit_account_id: account1.id, date: '2023-05-20', debit_account_id: account2.id, description: 'Second transaction', id: randomUUID(), project_id: project.id },
     otherAccountTransaction = { amount: 75.00, credit_account_id: account2.id, date: '2023-05-18', debit_account_id: account3.id, description: 'Other account transaction', id: randomUUID(), project_id: project.id },
     beforePeriodTransaction = { amount: 200.00, credit_account_id: account1.id, date: '2022-04-30', debit_account_id: account2.id, description: 'Before period transaction', id: randomUUID(), project_id: project.id },
     beforeDateTransaction = { amount: 300.00, credit_account_id: account1.id, date: '2023-01-01', debit_account_id: account2.id, description: 'Before date transaction', id: randomUUID(), project_id: project.id },
     doubleAccountTransaction = { amount: 25.00, credit_account_id: account1.id, date: '2023-05-25', debit_account_id: account1.id, description: 'Double account transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createOrModifyAccount(tx, task.id, account3)
      await createClosing(tx, task.id, closing1)
      await createClosing(tx, task.id, closing2)
      await createTransaction(tx, task.id, transaction1)
      await createTransaction(tx, task.id, transaction2)
      await createTransaction(tx, task.id, otherAccountTransaction)
      await createTransaction(tx, task.id, beforePeriodTransaction)
      await createTransaction(tx, task.id, beforeDateTransaction)
      await createTransaction(tx, task.id, doubleAccountTransaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(closing1.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { month: 1, openEnded: true, year: 2023 }))
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual(expect.objectContaining({
      amount: -closing2.profit,
      date: closing2.date,
      description: 'Closing 2023-05',
      ordering: 5,
      other_account_id: account2.id,
      total_balance: -closing1.profit - transaction1.amount - transaction2.amount - closing2.profit,
      transaction_id: undefined,
    }))
    expect(result[1]).toEqual(expect.objectContaining({
      amount: 0,
      date: doubleAccountTransaction.date,
      description: doubleAccountTransaction.description,
      ordering: 4,
      other_account_id: account1.id,
      total_balance: -closing1.profit - transaction1.amount - transaction2.amount,
      transaction_id: doubleAccountTransaction.id,
    }))
    expect(result[2]).toEqual(expect.objectContaining({
      amount: -transaction2.amount,
      date: transaction2.date,
      description: transaction2.description,
      ordering: 3,
      other_account_id: account2.id,
      total_balance: -closing1.profit - transaction1.amount - transaction2.amount,
      transaction_id: transaction2.id,
    }))
    expect(result[3]).toEqual(expect.objectContaining({
      amount: -transaction1.amount,
      date: transaction1.date,
      description: transaction1.description,
      ordering: 2,
      other_account_id: account2.id,
      total_balance: -closing1.profit - transaction1.amount,
      transaction_id: transaction1.id,
    }))
    expect(result[4]).toEqual(expect.objectContaining({
      amount: -closing1.profit,
      date: closing1.date,
      description: 'Closing 2023-01',
      ordering: 1,
      other_account_id: account2.id,
      total_balance: -closing1.profit,
      transaction_id: undefined,
    }))
  })

  test('Credit Account', async ({ task }) => {
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'A1', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'A2', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 100.50, credit_account_id: account1.id, date: '2023-05-15', debit_account_id: account2.id, description: 'Test transaction', id: randomUUID(), project_id: project.id }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(transaction.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { month: 5, openEnded: true, year: 2023 }))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      amount: -transaction.amount,
      total_balance: -transaction.amount,
    }))
  })

  test('Existing Account Transaction', async ({ task }) => {
    const project = { archived: false, id: randomUUID(), name: 'Test Project', owner_email: task.id },
     account1 = { archived: false, id: randomUUID(), name: 'Cash', project_id: project.id, type: 'Asset' } as AccountInput,
     account2 = { archived: false, id: randomUUID(), name: 'Revenue', project_id: project.id, type: 'Income' } as AccountInput,
     transaction = { amount: 100.50, credit_account_id: account2.id, date: '2023-05-15', debit_account_id: account1.id, description: 'Test transaction', id: randomUUID(), project_id: project.id },
     accountTransaction = { account_id: account1.id, amount: 500.00, date: '2023-05-13', id: randomUUID(), ordering: 13, other_account_id: account2.id, project_id: project.id, total_balance: 500.00 } as AccountTransactionInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
      await createAccountTransaction(tx, task.id, accountTransaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(transaction.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { month: 5, openEnded: true, year: 2023 }))
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(expect.objectContaining({
      amount: transaction.amount,
      ordering: accountTransaction.ordering + 1,
      total_balance: accountTransaction.total_balance + transaction.amount,
      transaction_id: transaction.id,
    }))
  })
})
