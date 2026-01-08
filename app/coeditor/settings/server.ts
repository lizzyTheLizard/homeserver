'use server'

import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { createOrModifyProfile, findProfilesByOwner, Profile, ProfileInput, removeProfile } from '../_data/Profile'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { createOrModifyTemplate, findTemplatesByOwner, removeTemplate, Template, TemplateInput } from '../_data/Template'

export interface SettingsData {
  profiles: Profile[]
  templates: Template[]
}

export async function loadSettings(): Promise<SettingsData> {
  const user = await getAuthenticatedUserSession('cash')
  const [templates, profiles] = await transactional(async tx => ([
    await findTemplatesByOwner(tx, user.sub),
    await findProfilesByOwner(tx, user.sub),
  ]))
  return { profiles, templates }
}

export async function deleteProfile(profile: ProfileInput): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateString(profile.id)
    return removeProfile(client, user.sub, profile.id)
  }))
}

export async function updateProfile(input: ProfileInput): ActionResponse<Profile> {
  'use server'
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateObject(input, ProfileInputConstraints)
    return createOrModifyProfile(client, user.sub, input)
  }))
}

export async function deleteTemplate(template: TemplateInput): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateString(template.id)
    await removeTemplate(client, user.sub, template.id)
  }))
}

export async function updateTemplate(input: TemplateInput): ActionResponse<Template> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('cash')
    validateObject(input, TemplateInputConstraints)
    return createOrModifyTemplate(client, user.sub, input)
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
