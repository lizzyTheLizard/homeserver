'use server'

import { Account, AccountInput, createOrModifyAccount, findAllAccountsForProject, removeAccount } from '@/app/cash/_data/Account'
import { ACCOUNT_TYPES } from '@/app/cash/_data/AccountType'
import { findProjectById } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { z } from 'zod'
import { notFound } from 'next/navigation'
import { logger } from '@/app/shared/logger'

export async function loadAccounts(projectId: string) {
  const user = await getAuthenticatedUserSession('cash')
  const [project, accounts] = await nontransactional(c => Promise.all([
    findProjectById(c, user.email, projectId),
    findAllAccountsForProject(c, user.email, projectId),
  ]))
  if (!project) {
    logger.warn(`Project with id ${projectId} not found for user ${user.email}`)
    return notFound()
  }
  return accounts
}

export async function deleteAccount(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateString(id)
    const account = await removeAccount(client, user.email, id)
    if (!account) logger.info(`Account with id ${id} not found for deletion for user ${user.email}`)
    else logger.info(`Deleted account ${account.name} with id ${id} for user ${user.email}`)
  }))
}

export async function saveAccount(input: AccountInput): ActionResponse<Account> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateObject(input, AccountInputSchema)
    const result = await createOrModifyAccount(client, user.email, input)
    logger.info(`Saved account ${input.name} with id ${result.id} for user ${user.email}`)
    return result
  }))
}

const AccountInputSchema = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  archived: z.boolean(),
})
