'use server'

import { Account, AccountInput, createOrModifyAccount, findAllAccountsForProject, removeAccount } from '@/app/cash/Account'
import { ACCOUNT_TYPES } from '@/app/cash/AccountType'
import { findProjectById } from '@/app/cash/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/db'
import { validateObject, validateString } from '@/app/shared/validation'
import { notFound } from 'next/navigation'

export async function loadAccounts(projectId: string) {
  const user = await getAuthenticatedUserSession('cash')
  const [project, accounts] = await nontransactional(async c => ([
    await findProjectById(c, user.sub, projectId),
    await findAllAccountsForProject(c, user.sub, projectId),
  ]))
  if (!project) {
    console.log(`Project with id ${projectId} not found for user ${user.sub}`)
    return notFound()
  }
  return accounts
}

export async function deleteAccount(input: AccountInput): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateString(input.id)
    await removeAccount(client, user.sub, input.id)
  }))
}

export async function saveAccount(input: AccountInput): ActionResponse<Account> {
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
