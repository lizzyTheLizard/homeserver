'use server'

import { Account, AccountInput, createOrModifyAccount, findAllAccountsForProject, removeAccount } from '@/app/cash/_data/Account'
import { ACCOUNT_TYPES } from '@/app/cash/_data/AccountType'
import { findProjectById } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/db'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { notFound } from 'next/navigation'
import { logger } from '@/app/shared/logger'

export async function loadAccounts(projectId: string) {
  const user = await getAuthenticatedUserSession('cash')
  const [project, accounts] = await nontransactional(async c => ([
    await findProjectById(c, user.sub, projectId),
    await findAllAccountsForProject(c, user.sub, projectId),
  ]))
  if (!project) {
    logger.info(`Project with id ${projectId} not found for user ${user.sub}`)
    return notFound()
  }
  return accounts
}

export async function deleteAccount(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateString(id)
    await removeAccount(client, user.sub, id)
  }))
}

export async function saveAccount(input: AccountInput): ActionResponse<Account> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
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
