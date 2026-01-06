import { findProjectById } from '@/app/cash/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/db'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { notFound } from 'next/navigation'
import { Journal } from './Journal'
import { findAllAccountsForProject } from '@/app/cash/Account'
import { createOrModifyTransaction, findAllTransactions, removeTransaction, Transaction, TransactionInput } from '@/app/cash/Transaction'
import { stringToPeriod } from '@/app/cash/Period'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'
import { validateObject, validateString } from '@/app/shared/validation'

export const metadata: Metadata = {
  title: 'Cash - Journal',
}

export interface JournalPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
}

export default async function Page({ params }: JournalPageProps) {
  const user = await getAuthenticatedUserSession('cash')
  const paramsResolved = await params
  const period = stringToPeriod(paramsResolved.period)
  const [project, accounts, transactions] = await nontransactional(async c => ([
    await findProjectById(c, user.sub, paramsResolved.project_id),
    await findAllAccountsForProject(c, user.sub, paramsResolved.project_id),
    await findAllTransactions(c, user.sub, paramsResolved.project_id, period),
  ]))
  if (!project) {
    console.log(`Project with id ${paramsResolved.project_id} not found for user ${user.sub}`)
    return notFound()
  }
  return (
    <Journal
      project_id={paramsResolved.project_id}
      period={period}
      accounts={accounts}
      transactions={transactions}
      onDeleteTransaction={deleteTransaction}
      onSaveTransaction={saveTransaction}
    />
  )
}

async function deleteTransaction(input: TransactionInput): ActionResponse<void> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateString(input.id)
    await removeTransaction(client, user.sub, input.id)
  }))
}

async function saveTransaction(input: TransactionInput): ActionResponse<Transaction> {
  'use server'
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
