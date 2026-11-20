'use server'
import { type Account, findAllAccountsForProject } from '@/app/cash/_data/Account';
import { type AccountTransaction, findAllAccountTransactionsInPeriod, findLatestAccountTransactionBefore } from '@/app/cash/_data/AccountTransaction'
import { type ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse';
import { type Closing, findLastClosing } from '@/app/cash/_data/Closing';
import { MONTHLY_STATES, nextState } from '@/app/cash/_data/MonthlyState'
import { type Monthly, type MonthlyInput, type SharedTransaction, createMonthlyClosing, findBeforePeriod, findForPeriod, modifyMonthlyClosing } from '@/app/cash/_data/Monthly';
import { lastDay, startDate } from '@/app/cash/_helper/Period'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import type { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { createTransactionsFromNeonInput } from './__helper/CreateNeonTransaction'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { logEvent } from '@/app/shared/_data/Event'
import { validateObject } from '@/app/shared/_helper/validation'
import { z } from 'zod'

export type PageData = { type: 'ALREADY_CLOSED' }
  | { type: 'NOT_FOUND', lastMonthClosing: Monthly | undefined, accounts: Account[] }
  | { type: 'NEON', monthly: Monthly, accounts: Account[] }
  | { type: 'SHARED', monthly: Monthly, accounts: Account[], transactions: AccountTransaction[], lastTransaction: AccountTransaction | undefined }
  | { type: 'FINISHED', monthly: Monthly, accounts: Account[], transactionsSharedAccount: AccountTransaction[], lastTransactionSharedAccount: AccountTransaction | undefined, transactionsNeonAccount: AccountTransaction[], lastTransactionNeonAccount: AccountTransaction | undefined, latestClosing: Closing | undefined }
  | { type: 'CHECK_ACCOUNT', monthly: Monthly, accounts: Account[], account: Account, transactions: AccountTransaction[], lastTransaction: AccountTransaction | undefined }

export async function loadData(projectId: string, period: MonthlyPeriod): Promise<PageData> {
  return nontransactional(async (c) => {
    const user = await getAuthenticatedUserSession('cash'),
     monthly = await findForPeriod(c, user.email, projectId, period),
     closing = await findLastClosing(c, user.email, projectId)
    if ((closing && closing.date >= lastDay(period)) && monthly?.state !== 'FINISHED') {return { type: 'ALREADY_CLOSED' }}

    const lastMonthClosing = await findBeforePeriod(c, user.email, projectId, period),
     accounts = await findAllAccountsForProject(c, user.email, projectId)

    if (!monthly) {return { accounts, lastMonthClosing, type: 'NOT_FOUND' }}
    if (monthly.state === 'NEON') {return { accounts, monthly, type: 'NEON' }}
    if (monthly.state === 'FINISHED') {
      const transactionsSharedAccount = await findAllAccountTransactionsInPeriod(c, user.email, monthly.shared_account_id, period),
       lastTransactionSharedAccount = await findLatestAccountTransactionBefore(c, user.email, monthly.shared_account_id, period),
       transactionsNeonAccount = await findAllAccountTransactionsInPeriod(c, user.email, monthly.neon_account_id, period),
       lastTransactionNeonAccount = await findLatestAccountTransactionBefore(c, user.email, monthly.neon_account_id, period)
      return { accounts, lastTransactionNeonAccount, lastTransactionSharedAccount, latestClosing: closing, monthly, transactionsNeonAccount, transactionsSharedAccount, type: 'FINISHED' }
    }

    const accountId = getCurrentAccountIdForMonthly(monthly)
    if (!accountId) {throw new Error(`Current account id not found for monthly in state ${  monthly.state}`)}
    const transactions = await findAllAccountTransactionsInPeriod(c, user.email, accountId, period),
     lastTransaction = await findLatestAccountTransactionBefore(c, user.email, accountId, period)
    if (monthly.state === 'SHARED') {return { accounts, lastTransaction, monthly, transactions, type: 'SHARED' }}

    const account = accounts.find(a => a.id === accountId)
    if (!account) {throw new Error(`Account with id ${  accountId  } not found`)}
    return { account, accounts, lastTransaction, monthly, transactions, type: 'CHECK_ACCOUNT' }
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
      if (transaction.date < startDate(input.period)) {throw new Error('Transaction date must be within the period')}
      if (transaction.date > lastDay(input.period)) {throw new Error('Transaction date must be within the period')}
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
    const user = await getAuthenticatedUserSession('cash'),
     monthly = await findForPeriod(client, user.email, projectId, period)
    if (monthly?.state !== 'NEON') {throw new Error('Monthly closing not found or not in NEON state')}
    monthly.neon_transactions = await createTransactionsFromNeonInput(client, user.email, monthly, transactions)
    monthly.state = 'NEONCHECK'
    await modifyMonthlyClosing(client, user.email, monthly)
    await logEvent(client, 'INFO', `Added ${transactions.length.toString()} Neon transactions for period ${period.year.toString()}-${period.month.toString().padStart(2, '0')}`)
  }))
}

export async function markAsChecked(projectId: string, period: MonthlyPeriod): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash'),
     m = await findForPeriod(client, user.email, projectId, period)
    if (!m) {throw new Error('Monthly closing not found')}
    if (!m.state.endsWith('CHECK')) {throw new Error('Monthly closing not in CHECK state')}
    m.state = nextState(m.state)
    await modifyMonthlyClosing(client, user.email, m)
    await logEvent(client, 'INFO', `Marked monthly closing as checked for period ${period.year.toString()}-${period.month.toString().padStart(2, '0')}`)
  }))
}

export async function addSharedTransactions(projectId: string, period: MonthlyPeriod, transactions: SharedTransaction[]): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    transactions.forEach((transaction) => { validateObject(transaction, SharedTransactionSchema) })
    const user = await getAuthenticatedUserSession('cash'),
     monthly = await findForPeriod(client, user.email, projectId, period)
    if (monthly?.state !== 'SHARED') {throw new Error('Monthly closing not found or not in SHARED state')}
    monthly.shared_transactions = transactions
    monthly.state = 'FINISHED'
    await modifyMonthlyClosing(client, user.email, monthly)
    await logEvent(client, 'INFO', `Added ${transactions.length.toString()} shared transactions for period ${period.year.toString()}-${period.month.toString().padStart(2, '0')}`)
  }))
}

const NeonTransactionInputSchema = z.object({
  accountId: z.uuid(),
  description: z.string().min(1),
  order: z.number(),
}),

 SharedTransactionSchema = z.object({
  category: z.string().min(1),
  transaction_id: z.uuid(),
}),

 NeonTransactionSchema = z.object({
  amount: z.number(),
  date: z.iso.date(),
  description: z.string().optional(),
  order: z.number(),
  subject: z.string().optional(),
  transaction_id: z.uuid().optional(),
}),

 MonthlyInputSchema = z.object({
  credit_card_account_id: z.uuid(),
  id: z.uuid(),
  neon_account_id: z.uuid(),
  neon_transactions: z.array(NeonTransactionSchema),
  period: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
  project_id: z.uuid(),
  remaining_account_id: z.uuid(),
  shared_account_id: z.uuid(),
  shared_transactions: z.array(SharedTransactionSchema).max(0),
  state: z.enum(MONTHLY_STATES),
})
