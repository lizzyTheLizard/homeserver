'use server'
import { findProjectById } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { notFound } from 'next/navigation'
import { Account, findAllAccountsForProject } from '@/app/cash/_data/Account'
import { createTransaction, findAllTransactions, findTransactionsById, modifyTransaction, removeTransaction, Transaction, TransactionInput } from '@/app/cash/_data/Transaction'
import { Period } from '@/app/cash/_helper/Period'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { Closing, findLastClosing } from '@/app/cash/_data/Closing'
import { invalidInput } from '@/app/shared/_helper/BackendError'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { AccountTransaction, findAllAccountTransactionsInPeriod, findLatestAccountTransactionBefore } from '@/app/cash/_data/AccountTransaction'
import { Temporal } from '@js-temporal/polyfill'
import { logger } from '@/app/shared/logger'

export interface AccountJournalData {
  account: Account
  accounts: Account[]
  transactions: AccountTransaction[]
  lastTransaction: AccountTransaction | undefined
}

export async function loadAccountJournal(period: Period, projectId: string, accountId: string): Promise<AccountJournalData> {
  const user = await getAuthenticatedUserSession('cash')
  const [project, accounts, transactions, lastTransaction] = await nontransactional(async c => ([
    await findProjectById(c, user.sub, projectId),
    await findAllAccountsForProject(c, user.sub, projectId),
    await findAllAccountTransactionsInPeriod(c, user.sub, accountId, period),
    await findLatestAccountTransactionBefore(c, user.sub, accountId, period),
  ]))
  if (!project) return notFound()
  const account = accounts.find(acc => acc.id === accountId)
  if (!account) throw invalidInput(`Account ${accountId} not found`)
  return { account, accounts, transactions, lastTransaction }
}

export interface JournalData {
  accounts: Account[]
  transactions: Transaction[]
}

export async function loadJournal(period: Period, projectId: string): Promise<JournalData> {
  const user = await getAuthenticatedUserSession('cash')
  const [project, accounts, transactions] = await nontransactional(async c => ([
    await findProjectById(c, user.sub, projectId),
    await findAllAccountsForProject(c, user.sub, projectId),
    await findAllTransactions(c, user.sub, projectId, period),
  ]))
  if (!project) return notFound()

  return { accounts, transactions }
}

export async function deleteTransaction(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateString(id)
    const existingTransaction = await findTransactionsById(client, user.sub, id)
    if (!existingTransaction) return
    const lastClosing = await findLastClosing(client, user.sub, existingTransaction.project_id)
    if (isClosed(lastClosing, existingTransaction.date)) throw invalidInput('Cannot delete transaction from closed period')
    const result = await removeTransaction(client, user.sub, id)
    if (!result) {
      logger.info(`Transaction with id ${id} not found for deletion for user ${user.sub}`)
      return
    }
    const date = Temporal.PlainDate.from(existingTransaction.date)
    await recalculateTransactions(client, user.sub, existingTransaction.project_id, date, [existingTransaction.credit_account_id, existingTransaction.debit_account_id])
    logger.info(`Deleted transaction with id ${id} for user ${user.sub}`)
  }))
}

export async function saveTransaction(input: TransactionInput): ActionResponse<Transaction> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateObject(input, TransactionInputConstraints)
    const lastClosing = await findLastClosing(client, user.sub, input.project_id)
    if (isClosed(lastClosing, input.date)) throw invalidInput('Cannot modify transaction in closed period')
    const existingTransaction = await findTransactionsById(client, user.sub, input.id)
    if (existingTransaction) {
      if (existingTransaction.project_id !== input.project_id) throw invalidInput('Cannot change project of existing transaction')
      if (isClosed(lastClosing, existingTransaction.date)) throw invalidInput('Cannot modify transaction from closed period')
      const result = await modifyTransaction(client, user.sub, input)
      const date = Temporal.PlainDate.from(min(input.date, existingTransaction.date))
      await recalculateTransactions(client, user.sub, input.project_id, date, [input.credit_account_id, input.debit_account_id, existingTransaction.credit_account_id, existingTransaction.debit_account_id])
      logger.info(`Modified transaction with id ${input.id} for user ${user.sub}`)
      return result
    }
    else {
      const project = await findProjectById(client, user.sub, input.project_id)
      if (!project) throw invalidInput('Cannot create transaction for non-existing project')
      const result = await createTransaction(client, user.sub, input)
      const date = Temporal.PlainDate.from(input.date)
      await recalculateTransactions(client, user.sub, input.project_id, date, [input.credit_account_id, input.debit_account_id])
      logger.info(`Created transaction with id ${input.id} for user ${user.sub}`)
      return result
    }
  }))
}

function isClosed(lastClosing: Closing | undefined, transactionDate: string): boolean {
  if (!lastClosing) return false
  return transactionDate <= lastClosing.date
}

function min(date1: string, date2: string): string {
  return date1 < date2 ? date1 : date2
}

const TransactionInputConstraints = {
  id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  project_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  credit_account_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  debit_account_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  amount: {
    presence: { allowEmpty: false },
    type: 'number',
  },
  date: {
    presence: { allowEmpty: true },
  },
  description: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}
