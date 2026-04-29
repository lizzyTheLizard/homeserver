'use server'
import { findProjectById } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, Queryable, transactional } from '@/app/shared/_external/db/access'
import { notFound } from 'next/navigation'
import { Account, findAllAccountsForProject } from '@/app/cash/_data/Account'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { Closing, createClosing, findLastClosing, removeClosingAfter as removeClosingAfterOrOn } from '@/app/cash/_data/Closing'
import { AccountTransaction, findLatestAccountTransactionsBefore, findLatestAccountTransactionsIn } from '@/app/cash/_data/AccountTransaction'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'
import { v4 as randomUUID } from 'uuid'
import { findOldestTransaction } from '@/app/cash/_data/Transaction'
import { lastDay, Period, toString } from '@/app/cash/_helper/Period'
import { from, first, last, compare, MonthlyPeriod, next } from '@/app/cash/_helper/MonthlyPeriod'
import { logger } from '@/app/shared/logger'
import { getTotalForAccounts } from '@/app/cash/_helper/AccountTotal'

export interface ReportsData {
  accounts: Account[]
  latestClosing: Closing | undefined
  beforeTransactions: AccountTransaction[]
  currentTransactions: AccountTransaction[]
}

export async function loadReports(period: Period, projectId: string): Promise<ReportsData> {
  const user = await getAuthenticatedUserSession('cash')
  const [project, accounts, latestClosing, beforeTransactions, currentTransactions] = await nontransactional(c => Promise.all([
    findProjectById(c, user.email, projectId),
    findAllAccountsForProject(c, user.email, projectId),
    findLastClosing(c, user.email, projectId),
    findLatestAccountTransactionsBefore(c, projectId, user.email, period),
    findLatestAccountTransactionsIn(c, projectId, user.email, period),
  ]))
  const result = { project, accounts, latestClosing, beforeTransactions, currentTransactions }
  if (!result.project) return notFound()
  return result
}

export async function reopen(period: Period, projectId: string): ActionResponse<void> {
  const user = await getAuthenticatedUserSession('cash')
  return await toResponse(transactional(async (client) => {
    const firstPeriodToReopen = first(period)
    const firstClosingDate = lastDay(firstPeriodToReopen)
    const deleteClosing = await removeClosingAfterOrOn(client, user.email, projectId, firstClosingDate)
    const accountsToRecalculate = deleteClosing.map(c => [c.capital_account_id, c.profit_account_id]).flat()
    await recalculateTransactions(client, user.email, projectId, Temporal.PlainDate.from(firstClosingDate), accountsToRecalculate)
    logger.info(`Reopened period ${toString(firstPeriodToReopen)} to ${toString(period)} for project ${projectId} by user ${user.email}`)
  }))
}

export async function close(period: Period, project_id: string, profit_account_id: string, capital_account_id: string): ActionResponse<void> {
  const user = await getAuthenticatedUserSession('cash')
  return await toResponse(transactional(async (client) => {
    const lastPeriodToClose = last(period)
    const firstPeriodToClose = await getFirstPeriodToClose(client, user.email, project_id, period)
    let periodToClose = firstPeriodToClose
    do {
      const profit = await calculateProfitForPeriod(client, user.email, project_id, periodToClose)
      const date = lastDay(periodToClose)
      const id = randomUUID()
      const closingInput = { id, project_id, date, profit, capital_account_id, profit_account_id }
      await createClosing(client, user.email, closingInput)
      logger.info(`Closed period ${toString(periodToClose)} for project ${project_id} by user ${user.email} with profit ${profit.toString()}`)
      periodToClose = next(periodToClose)
    } while (compare(periodToClose, lastPeriodToClose) <= 0)
    const fromDate = Temporal.PlainDate.from(lastDay(firstPeriodToClose))
    await recalculateTransactions(client, user.email, project_id, fromDate, [profit_account_id, capital_account_id])
  }))
}

async function getFirstPeriodToClose(client: Queryable, owner: string, projectId: string, period: Period): Promise<MonthlyPeriod> {
  const latestClosing = await findLastClosing(client, owner, projectId)
  if (latestClosing !== undefined) return next(from(latestClosing.date))
  const firstTransaction = await findOldestTransaction(client, owner, projectId)
  if (firstTransaction === undefined) return first(period)
  const date = Temporal.PlainDate.from(firstTransaction.date)
  return { year: date.year, month: date.month, openEnded: false, day: undefined }
}

async function calculateProfitForPeriod(client: Queryable, owner: string, projectId: string, periodToClose: MonthlyPeriod): Promise<number> {
  const accounts = await findAllAccountsForProject(client, owner, projectId)
  const latest = await findLatestAccountTransactionsIn(client, projectId, owner, periodToClose)
  const before = await findLatestAccountTransactionsBefore(client, projectId, owner, periodToClose)
  const income = getTotalForAccounts(accounts.filter(a => a.type === 'Income'), before, latest)
  const expense = getTotalForAccounts(accounts.filter(a => a.type === 'Expense'), before, latest)
  return income - expense
}
