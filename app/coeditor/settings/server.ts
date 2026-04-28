'use server'

import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { createOrModifyProfile, findProfilesByOwner, Profile, ProfileInput, removeProfile } from '../_data/Profile'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/_external/db/access'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { createOrModifyTemplate, findTemplatesByOwner, removeTemplate, Template, TemplateInput } from '../_data/Template'
import { logger } from '@/app/shared/logger'

export interface SettingsData {
  profiles: Profile[]
  templates: Template[]
}

export async function loadSettings(): Promise<SettingsData> {
  const user = await getAuthenticatedUserSession('coeditor')
  const [templates, profiles] = await transactional(tx => Promise.all([
    findTemplatesByOwner(tx, user.email),
    findProfilesByOwner(tx, user.email),
  ]))
  return { profiles, templates }
}

export async function deleteProfile(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateString(id)
    const profile = await removeProfile(client, user.email, id)
    if (profile) logger.info(`Deleted profile with id ${id} for user ${user.email}`)
    else logger.info(`Profile with id ${id} not found for deletion for user ${user.email}`)
  }))
}

export async function saveProfile(input: ProfileInput): ActionResponse<Profile> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateObject(input, ProfileInputConstraints)
    const profile = await createOrModifyProfile(client, user.email, input)
    logger.info(`Saved profile with id ${profile.id} for user ${user.email} and language ${profile.language}`)
    return profile
  }))
}

export async function deleteTemplate(id: string): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateString(id)
    const template = await removeTemplate(client, user.email, id)
    if (template) logger.info(`Deleted template with id ${id} for user ${user.email}`)
    else logger.info(`Template with id ${id} not found for deletion for user ${user.email}`)
  }))
}

export async function saveTemplate(input: TemplateInput): ActionResponse<Template> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('coeditor')
    validateObject(input, TemplateInputConstraints)
    const template = await createOrModifyTemplate(client, user.email, input)
    logger.info(`Saved template with id ${template.id} for user ${user.email} and language ${template.language}`)
    return template
  }))
}

const TemplateInputConstraints = {
  id: {
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
  language: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  text: {
    presence: { allowEmpty: true },
    type: 'string',
  },
}

const ProfileInputConstraints = {
  language: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  text: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}
