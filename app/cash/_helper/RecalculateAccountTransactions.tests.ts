import { describe, expect, test } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import { AccountInput, createOrModifyAccount } from '../_data/Account'
import { createOrModifyProject } from '../_data/Project'
import { createTransaction } from '../_data/Transaction'
import { recalculateTransactions } from './RecalculateAccountTransactions'
import { AccountTransactionInput, createAccountTransaction, findAllAccountTransactionsInPeriod } from '../_data/AccountTransaction'
import { createClosing } from '../_data/Closing'
import { Temporal } from '@js-temporal/polyfill'

describe('loadJournal', () => {
  test('No Transactions', async ({ task }) => {
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from('2023-05-01'), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { year: 2023, month: 5, openEnded: true }))
    expect(result).toEqual([])
  })

  test('Single Transaction', async ({ task }) => {
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(transaction.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { year: 2023, month: 5, openEnded: true }))
    expect(result).toEqual([{
      id: expect.any(String) as string,
      owner_id: task.id,
      ordering: expect.any(Number) as number,
      account_id: account1.id,
      other_account_id: account2.id,
      amount: transaction.amount,
      total_balance: transaction.amount,
      date: transaction.date,
      transaction_id: transaction.id,
      description: transaction.description,
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
      project_id: project.id,
    }])
  })

  test('Single Closing', async ({ task }) => {
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const closing = { id: randomUUID(), project_id: project.id, date: '2023-01-31', capital_account_id: account1.id, profit_account_id: account2.id, profit: 200.75 }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createClosing(tx, task.id, closing)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(closing.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { year: 2023, month: 1, openEnded: true }))
    expect(result).toEqual([expect.objectContaining({
      account_id: account1.id,
      other_account_id: account2.id,
      amount: -closing.profit,
      total_balance: -closing.profit,
      date: closing.date,
      transaction_id: undefined,
      description: 'Closing 2023-01',
    })])
  })

  test('Multiple Transactions', async ({ task }) => {
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'A1', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'A2', type: 'Income', archived: false } as AccountInput
    const account3 = { id: randomUUID(), project_id: project.id, name: 'A3', type: 'Expense', archived: false } as AccountInput
    const closing1 = { id: randomUUID(), project_id: project.id, date: '2023-01-31', capital_account_id: account1.id, profit_account_id: account2.id, profit: 200 }
    const closing2 = { id: randomUUID(), project_id: project.id, date: '2023-05-31', capital_account_id: account1.id, profit_account_id: account2.id, profit: -100 }
    const transaction1 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    const transaction2 = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 50.25, date: '2023-05-20', description: 'Second transaction' }
    const otherAccountTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account3.id, amount: 75.00, date: '2023-05-18', description: 'Other account transaction' }
    const beforePeriodTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 200.00, date: '2022-04-30', description: 'Before period transaction' }
    const beforeDateTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 300.00, date: '2023-01-01', description: 'Before date transaction' }
    const doubleAccountTransaction = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account1.id, amount: 25.00, date: '2023-05-25', description: 'Double account transaction' }
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

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { year: 2023, month: 1, openEnded: true }))
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual(expect.objectContaining({
      ordering: 5,
      other_account_id: account2.id,
      amount: -closing2.profit,
      total_balance: -closing1.profit - transaction1.amount - transaction2.amount - closing2.profit,
      date: closing2.date,
      transaction_id: undefined,
      description: 'Closing 2023-05',
    }))
    expect(result[1]).toEqual(expect.objectContaining({
      ordering: 4,
      other_account_id: account1.id,
      amount: 0,
      total_balance: -closing1.profit - transaction1.amount - transaction2.amount,
      date: doubleAccountTransaction.date,
      transaction_id: doubleAccountTransaction.id,
      description: doubleAccountTransaction.description,
    }))
    expect(result[2]).toEqual(expect.objectContaining({
      ordering: 3,
      other_account_id: account2.id,
      amount: -transaction2.amount,
      total_balance: -closing1.profit - transaction1.amount - transaction2.amount,
      date: transaction2.date,
      transaction_id: transaction2.id,
      description: transaction2.description,
    }))
    expect(result[3]).toEqual(expect.objectContaining({
      ordering: 2,
      other_account_id: account2.id,
      amount: -transaction1.amount,
      total_balance: -closing1.profit - transaction1.amount,
      date: transaction1.date,
      transaction_id: transaction1.id,
      description: transaction1.description,
    }))
    expect(result[4]).toEqual(expect.objectContaining({
      ordering: 1,
      other_account_id: account2.id,
      amount: -closing1.profit,
      total_balance: -closing1.profit,
      date: closing1.date,
      transaction_id: undefined,
      description: 'Closing 2023-01',
    }))
  })

  test('Credit Account', async ({ task }) => {
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'A1', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'A2', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account1.id, debit_account_id: account2.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(transaction.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { year: 2023, month: 5, openEnded: true }))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      amount: -transaction.amount,
      total_balance: -transaction.amount,
    }))
  })

  test('Existing Account Transaction', async ({ task }) => {
    const project = { id: randomUUID(), name: 'Test Project', owner_id: task.id, archived: false }
    const account1 = { id: randomUUID(), project_id: project.id, name: 'Cash', type: 'Asset', archived: false } as AccountInput
    const account2 = { id: randomUUID(), project_id: project.id, name: 'Revenue', type: 'Income', archived: false } as AccountInput
    const transaction = { id: randomUUID(), project_id: project.id, credit_account_id: account2.id, debit_account_id: account1.id, amount: 100.50, date: '2023-05-15', description: 'Test transaction' }
    const accountTransaction = { id: randomUUID(), account_id: account1.id, project_id: project.id, date: '2023-05-13', ordering: 13, other_account_id: account2.id, amount: 500.00, total_balance: 500.00 } as AccountTransactionInput

    await transactional(async (tx) => {
      await createOrModifyProject(tx, project)
      await createOrModifyAccount(tx, task.id, account1)
      await createOrModifyAccount(tx, task.id, account2)
      await createTransaction(tx, task.id, transaction)
      await createAccountTransaction(tx, task.id, accountTransaction)
    })

    await transactional(async tx => recalculateTransactions(tx, task.id, project.id, Temporal.PlainDate.from(transaction.date), [account1.id]))

    const result = await nontransactional(c => findAllAccountTransactionsInPeriod(c, task.id, account1.id, { year: 2023, month: 5, openEnded: true }))
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(expect.objectContaining({
      transaction_id: transaction.id,
      amount: transaction.amount,
      total_balance: accountTransaction.total_balance + transaction.amount,
      ordering: accountTransaction.ordering + 1,
    }))
  })
})
