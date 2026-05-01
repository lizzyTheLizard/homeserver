'use server'

import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { createOrModifyProfile, findProfilesByOwner, Profile, ProfileInput, removeProfile } from '../_data/Profile'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { z } from 'zod'
import { createOrModifyTemplate, findTemplatesByOwner, removeTemplate, Template, TemplateInput } from '../_data/Template'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'

export interface SettingsData {
  profiles: Profile[]
  templates: Template[]
}

export async function loadSettings(): Promise<SettingsData> {
  const user = await getAuthenticatedUserSession('coeditor')
  const [templates, profiles] = await nontransactional(c => Promise.all([
    findTemplatesByOwner(c, user.email),
    findProfilesByOwner(c, user.email),
  ]))
  return { profiles, templates }
}

export async function deleteProfile(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateString(id)
    const profile = await removeProfile(client, user.email, id)
    if (profile) {
      logger.info(`Deleted profile with id ${id} for user ${user.email}`)
      await logEvent(client, 'INFO', `Deleted CoEditor profile ${profile.language}`)
    }
    else {
      logger.info(`Profile with id ${id} not found for deletion for user ${user.email}`)
    }
  }))
}

export async function saveProfile(input: ProfileInput): ActionResponse<Profile> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateObject(input, ProfileInputSchema)
    const profile = await createOrModifyProfile(client, user.email, input)
    logger.info(`Saved profile with id ${profile.id} for user ${user.email} and language ${profile.language}`)
    await logEvent(client, 'INFO', `Saved CoEditor profile ${profile.language}`)
    return profile
  }))
}

export async function deleteTemplate(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateString(id)
    const template = await removeTemplate(client, user.email, id)
    if (template) {
      logger.info(`Deleted template with id ${id} for user ${user.email}`)
      await logEvent(client, 'INFO', `Deleted CoEditor template ${template.name}`)
    }
    else {
      logger.info(`Template with id ${id} not found for deletion for user ${user.email}`)
    }
  }))
}

export async function saveTemplate(input: TemplateInput): ActionResponse<Template> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateObject(input, TemplateInputSchema)
    const template = await createOrModifyTemplate(client, user.email, input)
    logger.info(`Saved template with id ${template.id} for user ${user.email} and language ${template.language}`)
    await logEvent(client, 'INFO', `Saved CoEditor template ${template.name}`)
    return template
  }))
}

const TemplateInputSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  language: z.string().min(1),
  text: z.string(),
})

const ProfileInputSchema = z.object({
  language: z.string().min(1),
  text: z.string().min(1),
})
