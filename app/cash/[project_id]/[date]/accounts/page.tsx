import { Account, AccountInput, createOrModifyAccount, findAllAccountsForProject, removeAccount } from '@/app/cash/Account'
import { findProjectById } from '@/app/cash/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/db'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { notFound } from 'next/navigation'
import { Accounts } from './Accounts'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'
import { validateObject, validateString } from '@/app/shared/validation'
import { ACCOUNT_TYPES } from '@/app/cash/AccountType'

export const metadata: Metadata = {
  title: 'Cash - Accounts',
}

export interface AccountPageProps {
  params: Promise<{
    project_id: string
    date: string
  }>
}

export default async function Page({ params }: AccountPageProps) {
  const user = await getAuthenticatedUserSession('cash')
  const paramsResolved = await params
  const project = await nontransactional(c => findProjectById(c, user.sub, paramsResolved.project_id))
  if (!project) {
    console.log(`Project with id ${paramsResolved.project_id} not found for user ${user.sub}`)
    return notFound()
  }
  const accounts = await nontransactional(c => findAllAccountsForProject(c, user.sub, paramsResolved.project_id))
  return (
    <main>
      <h1>Accounts</h1>
      <Accounts project_id={paramsResolved.project_id} accounts={accounts} onDeleteAccount={deleteAccount} onSaveAccount={saveAccount} />
    </main>
  )
}

async function deleteAccount(id: string): ActionResponse<void> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateString(id)
    await removeAccount(client, user.sub, id)
  }))
}

async function saveAccount(input: AccountInput): ActionResponse<Account> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateObject(input, AccountInputConstraints)
    return createOrModifyAccount(client, user.sub, input)
  }))
}

const AccountInputConstraints = {
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
  name: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  type: {
    presence: { allowEmpty: false },
    inclusion: ACCOUNT_TYPES,
  },
  archived: {
    presence: { allowEmpty: true },
    type: 'boolean',
  },
}
