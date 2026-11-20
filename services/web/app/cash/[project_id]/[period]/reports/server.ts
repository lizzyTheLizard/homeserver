'use server'
import { type Account, findAllAccountsForProject } from '@/app/cash/_data/Account';
import { type AccountTransaction, findLatestAccountTransactionsBefore, findLatestAccountTransactionsIn } from '@/app/cash/_data/AccountTransaction'
import { type ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse';
import { type Closing, createClosing, findLastClosing, removeClosingAfter as removeClosingAfterOrOn } from '@/app/cash/_data/Closing'
import { type MonthlyPeriod, compare, first, from, last, next } from '@/app/cash/_helper/MonthlyPeriod'
import { type Period, lastDay, toString } from '@/app/cash/_helper/Period'
import { type Queryable, nontransactional, transactional } from '@/app/shared/_external/db/access'
import { Temporal } from '@js-temporal/polyfill'
import { findOldestTransaction } from '@/app/cash/_data/Transaction'
import { findProjectById } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getTotalForAccounts } from '@/app/cash/_helper/AccountTotal'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'
import { notFound } from 'next/navigation'
import { v4 as randomUUID } from 'uuid'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'

export interface ReportsData {
  accounts: Account[]
  latestClosing: Closing | undefined
  beforeTransactions: AccountTransaction[]
  currentTransactions: AccountTransaction[]
}

export async function loadReports(period: Period, projectId: string): Promise<ReportsData> {
  const user = await getAuthenticatedUserSession('cash'),
   [project, accounts, latestClosing, beforeTransactions, currentTransactions] = await nontransactional(c => Promise.all([
    findProjectById(c, user.email, projectId),
    findAllAccountsForProject(c, user.email, projectId),
    findLastClosing(c, user.email, projectId),
    findLatestAccountTransactionsBefore(c, projectId, user.email, period),
    findLatestAccountTransactionsIn(c, projectId, user.email, period),
  ])),
   result = { accounts, beforeTransactions, currentTransactions, latestClosing, project }
  if (!result.project) {return notFound()}
  return result
}

export async function reopen(period: Period, projectId: string): ActionResponse<void> {
  const user = await getAuthenticatedUserSession('cash')
  return await toResponse(transactional(async (client) => {
    const firstPeriodToReopen = first(period),
     firstClosingDate = lastDay(firstPeriodToReopen),
     deleteClosing = await removeClosingAfterOrOn(client, user.email, projectId, firstClosingDate),
     accountsToRecalculate = deleteClosing.map(c => [c.capital_account_id, c.profit_account_id]).flat()
    await recalculateTransactions(client, user.email, projectId, Temporal.PlainDate.from(firstClosingDate), accountsToRecalculate)
    logger.info(`Reopened period ${toString(firstPeriodToReopen)} to ${toString(period)} for project ${projectId} by user ${user.email}`)
    await logEvent(client, 'INFO', `Reopened period ${toString(period)}`)
  }))
}

export async function close(period: Period, project_id: string, profit_account_id: string, capital_account_id: string): ActionResponse<void> {
  const user = await getAuthenticatedUserSession('cash')
  return await toResponse(transactional(async (client) => {
    const lastPeriodToClose = last(period),
     firstPeriodToClose = await getFirstPeriodToClose(client, user.email, project_id, period)
    let periodToClose = firstPeriodToClose
    do {
      const profit = await calculateProfitForPeriod(client, user.email, project_id, periodToClose),
       date = lastDay(periodToClose),
       id = randomUUID(),
       closingInput = { capital_account_id, date, id, profit, profit_account_id, project_id }
      await createClosing(client, user.email, closingInput)
      logger.info(`Closed period ${toString(periodToClose)} for project ${project_id} by user ${user.email} with profit ${profit.toString()}`)
      periodToClose = next(periodToClose)
    } while (compare(periodToClose, lastPeriodToClose) <= 0)
    const fromDate = Temporal.PlainDate.from(lastDay(firstPeriodToClose))
    await recalculateTransactions(client, user.email, project_id, fromDate, [profit_account_id, capital_account_id])
    await logEvent(client, 'INFO', `Closed period ${toString(period)}`)
  }))
}

async function getFirstPeriodToClose(client: Queryable, owner: string, projectId: string, period: Period): Promise<MonthlyPeriod> {
  const latestClosing = await findLastClosing(client, owner, projectId)
  if (latestClosing !== undefined) {return next(from(latestClosing.date))}
  const firstTransaction = await findOldestTransaction(client, owner, projectId)
  if (firstTransaction === undefined) {return first(period)}
  const date = Temporal.PlainDate.from(firstTransaction.date)
  return { day: undefined, month: date.month, openEnded: false, year: date.year }
}

async function calculateProfitForPeriod(client: Queryable, owner: string, projectId: string, periodToClose: MonthlyPeriod): Promise<number> {
  const accounts = await findAllAccountsForProject(client, owner, projectId),
   latest = await findLatestAccountTransactionsIn(client, projectId, owner, periodToClose),
   before = await findLatestAccountTransactionsBefore(client, projectId, owner, periodToClose),
   income = getTotalForAccounts(accounts.filter(a => a.type === 'Income'), before, latest),
   expense = getTotalForAccounts(accounts.filter(a => a.type === 'Expense'), before, latest)
  return income - expense
}
