'use server'
import { createMonthlyClosing, findBeforePeriod, findForPeriod, modifyMonthlyClosing, Monthly, MonthlyInput, SharedTransaction } from '@/app/cash/_data/Monthly'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { validateObject } from '@/app/shared/_helper/validation'
import { createTransactionsFromNeonInput } from './__helper/CreateNeonTransaction'
import { lastDay, startDate } from '@/app/cash/_helper/Period'
import { MONTHLY_STATES, nextState } from '@/app/cash/_data/MonthlyState'
import { z } from 'zod'
import { Account, findAllAccountsForProject } from '@/app/cash/_data/Account'
import { Closing, findLastClosing } from '@/app/cash/_data/Closing'
import { AccountTransaction, findAllAccountTransactionsInPeriod, findLatestAccountTransactionBefore } from '@/app/cash/_data/AccountTransaction'
import { logEvent } from '@/app/shared/_data/Event'

export type PageData = { type: 'ALREADY_CLOSED' }
  | { type: 'NOT_FOUND', lastMonthClosing: Monthly | undefined, accounts: Account[] }
  | { type: 'NEON', monthly: Monthly, accounts: Account[] }
  | { type: 'SHARED', monthly: Monthly, accounts: Account[], transactions: AccountTransaction[], lastTransaction: AccountTransaction | undefined }
  | { type: 'FINISHED', monthly: Monthly, accounts: Account[], transactionsSharedAccount: AccountTransaction[], lastTransactionSharedAccount: AccountTransaction | undefined, transactionsNeonAccount: AccountTransaction[], lastTransactionNeonAccount: AccountTransaction | undefined, latestClosing: Closing | undefined }
  | { type: 'CHECK_ACCOUNT', monthly: Monthly, accounts: Account[], account: Account, transactions: AccountTransaction[], lastTransaction: AccountTransaction | undefined }

export async function loadData(projectId: string, period: MonthlyPeriod): Promise<PageData> {
  return nontransactional(async (c) => {
    const user = await getAuthenticatedUserSession('cash')
    const monthly = await findForPeriod(c, user.email, projectId, period)
    const closing = await findLastClosing(c, user.email, projectId)
    if ((closing && closing.date >= lastDay(period)) && monthly?.state !== 'FINISHED') return { type: 'ALREADY_CLOSED' }

    const lastMonthClosing = await findBeforePeriod(c, user.email, projectId, period)
    const accounts = await findAllAccountsForProject(c, user.email, projectId)

    if (!monthly) return { type: 'NOT_FOUND', lastMonthClosing, accounts }
    if (monthly.state === 'NEON') return { type: 'NEON', monthly, accounts }
    if (monthly.state === 'FINISHED') {
      const transactionsSharedAccount = await findAllAccountTransactionsInPeriod(c, user.email, monthly.shared_account_id, period)
      const lastTransactionSharedAccount = await findLatestAccountTransactionBefore(c, user.email, monthly.shared_account_id, period)
      const transactionsNeonAccount = await findAllAccountTransactionsInPeriod(c, user.email, monthly.neon_account_id, period)
      const lastTransactionNeonAccount = await findLatestAccountTransactionBefore(c, user.email, monthly.neon_account_id, period)
      return { type: 'FINISHED', monthly, accounts, transactionsSharedAccount, lastTransactionSharedAccount, transactionsNeonAccount, lastTransactionNeonAccount, latestClosing: closing }
    }

    const accountId = getCurrentAccountIdForMonthly(monthly)
    if (!accountId) throw new Error('Current account id not found for monthly in state ' + monthly.state)
    const transactions = await findAllAccountTransactionsInPeriod(c, user.email, accountId, period)
    const lastTransaction = await findLatestAccountTransactionBefore(c, user.email, accountId, period)
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
    validateObject(input, MonthlyInputSchema)
    input.neon_transactions.forEach((transaction) => {
      if (transaction.date < startDate(input.period)) throw new Error('Transaction date must be within the period')
      if (transaction.date > lastDay(input.period)) throw new Error('Transaction date must be within the period')
    })
    const user = await getAuthenticatedUserSession('cash')
    await createMonthlyClosing(client, user.email, input)
    await logEvent(client, 'INFO', `Initialized monthly closing for period ${input.period.year.toString()}-${input.period.month.toString().padStart(2, '0')}`)
  }))
}

export interface NeonTransactionInput {
  order: number
  accountId: string
  description: string
}

export async function addNeonTransactions(projectId: string, period: MonthlyPeriod, transactions: NeonTransactionInput[]): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    transactions.forEach((transaction) => { validateObject(transaction, NeonTransactionInputSchema) })
    const user = await getAuthenticatedUserSession('cash')
    const monthly = await findForPeriod(client, user.email, projectId, period)
    if (monthly?.state !== 'NEON') throw new Error('Monthly closing not found or not in NEON state')
    monthly.neon_transactions = await createTransactionsFromNeonInput(client, user.email, monthly, transactions)
    monthly.state = 'NEONCHECK'
    await modifyMonthlyClosing(client, user.email, monthly)
    await logEvent(client, 'INFO', `Added ${transactions.length.toString()} Neon transactions for period ${period.year.toString()}-${period.month.toString().padStart(2, '0')}`)
  }))
}

export async function markAsChecked(projectId: string, period: MonthlyPeriod): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    const m = await findForPeriod(client, user.email, projectId, period)
    if (!m) throw new Error('Monthly closing not found')
    if (!m.state.endsWith('CHECK')) throw new Error('Monthly closing not in CHECK state')
    m.state = nextState(m.state)
    await modifyMonthlyClosing(client, user.email, m)
    await logEvent(client, 'INFO', `Marked monthly closing as checked for period ${period.year.toString()}-${period.month.toString().padStart(2, '0')}`)
  }))
}

export async function addSharedTransactions(projectId: string, period: MonthlyPeriod, transactions: SharedTransaction[]): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    transactions.forEach((transaction) => { validateObject(transaction, SharedTransactionSchema) })
    const user = await getAuthenticatedUserSession('cash')
    const monthly = await findForPeriod(client, user.email, projectId, period)
    if (monthly?.state !== 'SHARED') throw new Error('Monthly closing not found or not in SHARED state')
    monthly.shared_transactions = transactions
    monthly.state = 'FINISHED'
    await modifyMonthlyClosing(client, user.email, monthly)
    await logEvent(client, 'INFO', `Added ${transactions.length.toString()} shared transactions for period ${period.year.toString()}-${period.month.toString().padStart(2, '0')}`)
  }))
}

const NeonTransactionInputSchema = z.object({
  order: z.number(),
  accountId: z.uuid(),
  description: z.string().min(1),
})

const SharedTransactionSchema = z.object({
  transaction_id: z.uuid(),
  category: z.string().min(1),
})

const NeonTransactionSchema = z.object({
  date: z.iso.date(),
  order: z.number(),
  amount: z.number(),
  description: z.string().optional(),
  subject: z.string().optional(),
  transaction_id: z.uuid().optional(),
})

const MonthlyInputSchema = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  period: z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
  }),
  shared_account_id: z.uuid(),
  neon_account_id: z.uuid(),
  remaining_account_id: z.uuid(),
  credit_card_account_id: z.uuid(),
  state: z.enum(MONTHLY_STATES),
  neon_transactions: z.array(NeonTransactionSchema),
  shared_transactions: z.array(SharedTransactionSchema).max(0),
})
