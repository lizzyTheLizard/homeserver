'use server'
import { findProjectById, Project } from '@/app/cash/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/db'
import { notFound } from 'next/navigation'
import { Account, findAllAccountsForProject } from '@/app/cash/Account'
import { createOrModifyTransaction, findAllTransactions, removeTransaction, Transaction, TransactionInput } from '@/app/cash/Transaction'
import { Period } from '@/app/cash/Period'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'
import { validateObject, validateString } from '@/app/shared/validation'

export interface JournalData {
  project: Project
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
  if (!project) {
    console.log(`Project with id ${projectId} not found for user ${user.sub}`)
    return notFound()
  }
  return { project, accounts, transactions }
}

export async function deleteTransaction(input: TransactionInput): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateString(input.id)
    await removeTransaction(client, user.sub, input.id)
  }))
}

export async function saveTransaction(input: TransactionInput): ActionResponse<Transaction> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateObject(input, TransactionInputConstraints)
    return createOrModifyTransaction(client, user.sub, input)
  }))
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
    presence: { allowEmpty: false },
    type: 'date',
  },
  description: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}
