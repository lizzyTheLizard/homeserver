'use server'
import { createMonthlyClosing, findBeforePeriod, findForPeriod, modifyMonthlyClosing, Monthly, MonthlyInput, SharedTransaction } from '@/app/cash/_data/Monthly'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { validateObject } from '@/app/shared/_helper/validation'
import { createTransactionsFromNeonInput } from './__helper/CreateNeonTransaction'
import { lastDay, startDate } from '@/app/cash/_helper/Period'
import { nextState } from '@/app/cash/_data/MonthlyState'
import { Account, findAllAccountsForProject } from '@/app/cash/_data/Account'
import { findLastClosing } from '@/app/cash/_data/Closing'
import { AccountTransaction, findAllAccountTransactionsInPeriod, findLatestAccountTransactionBefore } from '@/app/cash/_data/AccountTransaction'

export type PageData = { type: 'ALREADY_CLOSED' }
  | { type: 'NOT_FOUND', lastMonthClosing: Monthly | undefined, accounts: Account[] }
  | { type: 'NEON', monthly: Monthly, accounts: Account[] }
  | { type: 'SHARED', monthly: Monthly, accounts: Account[], transactions: AccountTransaction[], lastTransaction: AccountTransaction | undefined }
  | { type: 'FINISHED', monthly: Monthly, accounts: Account[] }
  | { type: 'CHECK_ACCOUNT', monthly: Monthly, accounts: Account[], account: Account, transactions: AccountTransaction[], lastTransaction: AccountTransaction | undefined }

export async function loadData(projectId: string, period: MonthlyPeriod): Promise<PageData> {
  return nontransactional(async (c) => {
    const user = await getAuthenticatedUserSession('cash')
    const monthly = await findForPeriod(c, user.sub, projectId, period)
    const closing = await findLastClosing(c, user.sub, projectId)
    if ((closing && closing.date >= lastDay(period)) && monthly?.state !== 'FINISHED') return { type: 'ALREADY_CLOSED' }

    const lastMonthClosing = await findBeforePeriod(c, user.sub, projectId, period)
    const accounts = await findAllAccountsForProject(c, user.sub, projectId)

    if (!monthly) return { type: 'NOT_FOUND', lastMonthClosing, accounts }
    if (monthly.state === 'NEON') return { type: 'NEON', monthly, accounts }
    if (monthly.state === 'FINISHED') return { type: 'FINISHED', monthly, accounts }

    const accountId = getCurrentAccountIdForMonthly(monthly)
    if (!accountId) throw new Error('Current account id not found for monthly in state ' + monthly.state)
    const transactions = await findAllAccountTransactionsInPeriod(c, user.sub, accountId, period)
    const lastTransaction = await findLatestAccountTransactionBefore(c, user.sub, accountId, period)
    if (monthly.state === 'SHARED') return { type: 'SHARED', monthly, accounts, transactions, lastTransaction }

    const account = accounts.find(a => a.id === accountId)
    if (!account) throw new Error('Account with id ' + accountId + ' not found')
    return { type: 'CHECK_ACCOUNT', monthly, accounts, account, transactions: transactions, lastTransaction }
  })
}

function getCurrentAccountIdForMonthly(monthly: Monthly | undefined): string | undefined {
  switch (monthly?.state) {
    case undefined:
    case 'NEON':
    case 'FINISHED':
      return undefined
    case 'NEONCHECK':
      return monthly.neon_account_id
    case 'CREDITCARDCHECK':
      return monthly.credit_card_account_id
    case 'SHARED':
    case 'SHAREDCHECK':
      return monthly.shared_account_id
  }
}

export async function initialize(input: MonthlyInput): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    validateObject(input, MonthlyInputConstraints)
    input.neon_transactions.forEach((transaction) => {
      validateObject(transaction, NeonTransactionConstraints)
      if (transaction.date < startDate(input.period)) throw new Error('Transaction date must be within the period')
      if (transaction.date > lastDay(input.period)) throw new Error('Transaction date must be within the period')
    })
    const user = await getAuthenticatedUserSession('cash')
    await createMonthlyClosing(client, user.sub, input)
  }))
}

export interface NeonTransactionInput {
  order: number
  accountId: string
  description: string
}

export async function addNeonTransactions(projectId: string, period: MonthlyPeriod, transactions: NeonTransactionInput[]): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    transactions.forEach((transaction) => { validateObject(transaction, NeonTransactionInputConstraints) })
    const user = await getAuthenticatedUserSession('cash')
    const monthly = await findForPeriod(client, user.sub, projectId, period)
    if (!monthly || monthly.state !== 'NEON') throw new Error('Monthly closing not found or not in NEON state')
    monthly.neon_transactions = await createTransactionsFromNeonInput(client, user.sub, monthly, transactions)
    monthly.state = 'NEONCHECK'
    await modifyMonthlyClosing(client, user.sub, monthly)
  }))
}

export async function markAsChecked(projectId: string, period: MonthlyPeriod): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    const m = await findForPeriod(client, user.sub, projectId, period)
    if (!m) throw new Error('Monthly closing not found')
    m.state = nextState(m.state)
    await modifyMonthlyClosing(client, user.sub, m)
  }))
}

export async function addSharedTransactions(projectId: string, period: MonthlyPeriod, transactions: SharedTransaction[]): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    transactions.forEach((transaction) => { validateObject(transaction, SharedTransactionInputConstraints) })
    const user = await getAuthenticatedUserSession('cash')
    const monthly = await findForPeriod(client, user.sub, projectId, period)
    if (!monthly || monthly.state !== 'SHARED') throw new Error('Monthly closing not found or not in SHARED state')
    monthly.shared_transactions = transactions
    monthly.state = 'FINISHED'
    await modifyMonthlyClosing(client, user.sub, monthly)
  }))
}

const MonthlyInputConstraints = {
  'id': {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  'project_id': {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  'period': {
    presence: { allowEmpty: false },
    type: 'object',
  },
  'period.year': {
    presence: { allowEmpty: false },
    type: 'number',
    numericality: {
      onlyInteger: true,
      greaterThanOrEqualTo: 2000,
      lessThanOrEqualTo: 2100,
    },
  },
  'period.month': {
    presence: { allowEmpty: false },
    type: 'number',
    numericality: {
      onlyInteger: true,
      greaterThanOrEqualTo: 1,
      lessThanOrEqualTo: 12,
    },
  },
  'shared_account_id': {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  'neon_account_id': {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  'credit_card_account_id': {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  'state': {
    presence: { allowEmpty: false },
    type: 'string',
    inclusion: {
      within: ['NEON', 'CREDITCARD', 'SHARED', 'FINISHED'],
      message: 'must be a valid state',
    },
  },
  'neon_transactions': {
    type: 'array',
    presence: { allowEmpty: true },
  },
  'shared_transactions': {
    type: 'array',
    presence: { allowEmpty: true },
    length: {
      maximum: 0,
    },
  },
}

const NeonTransactionConstraints = {
  date: {
    presence: { allowEmpty: false },
    datetime: {
      dateOnly: true,
    },
  },
  order: {
    presence: { allowEmpty: false },
    type: 'number',
  },
  amount: {
    presence: { allowEmpty: false },
    type: 'number',
  },
  description: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  subject: {
    type: 'string',
  },
  transaction_id: {
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
}

const NeonTransactionInputConstraints = {
  order: {
    presence: { allowEmpty: false },
    type: 'number',
  },
  accountId: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  description: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}

const SharedTransactionInputConstraints = {
  transaction_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  category: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}
