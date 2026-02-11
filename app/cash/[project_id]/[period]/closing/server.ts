'use server'

import { Account, findAllAccountsForProject } from '@/app/cash/_data/Account'
import { createMonthlyClosing, findBeforePeriod, findForPeriod, Monthly, MonthlyInput } from '@/app/cash/_data/Monthly'
import { MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { lastDay, startDate } from '@/app/cash/_helper/Period'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { validateObject } from '@/app/shared/_helper/validation'
import { logger } from '@/app/shared/logger'

export interface MonthlyData {
  monthly: Monthly | undefined
  lastMonthClosing: Monthly | undefined
  accounts: Account[]
}

export async function loadData(projectId: string, period: MonthlyPeriod): Promise<MonthlyData> {
  const user = await getAuthenticatedUserSession('cash')
  return await nontransactional(async c => ({
    monthly: await findForPeriod(c, user.sub, projectId, period),
    lastMonthClosing: await findBeforePeriod(c, user.sub, projectId, period),
    accounts: await findAllAccountsForProject(c, user.sub, projectId),
  }))
}

export async function initialize(input: MonthlyInput): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    validateObject(input, MonthlyInputConstraints)
    input.neon_transactions?.forEach((transaction) => { validateObject(transaction, NeonTransactionConstraints(input.period)) })
    const user = await getAuthenticatedUserSession('cash')
    logger.error(JSON.stringify(input))
    await createMonthlyClosing(client, user.sub, input)
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
}

const NeonTransactionConstraints = (period: MonthlyPeriod) => ({
  date: {
    presence: { allowEmpty: false },
    datetime: {
      dateOnly: true,
      earliest: startDate(period),
      latest: lastDay(period),
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
})
