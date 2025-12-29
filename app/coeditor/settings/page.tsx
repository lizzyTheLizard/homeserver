import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { createOrModifyProfile, findProfilesByOwner, Profile, ProfileInput, removeProfile } from '../Profile'
import { createOrModifyTemplate, findTemplatesByOwner, removeTemplate, Template, TemplateInput } from '../Template'
import { Settings } from './Settings'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'
import { validateObject, validateString } from '@/app/shared/validation'

export const metadata: Metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  const user = await getAuthenticatedUserSession()
  const [templates, profiles] = await transactional(async tx => ([
    await findTemplatesByOwner(tx, user.sub),
    await findProfilesByOwner(tx, user.sub),
  ]))

  return (
    <main>
      <h1>Settings</h1>
      <Settings
        profiles={profiles}
        templates={templates}
        onDeleteProfile={deleteProfile}
        onSaveProfile={updateProfile}
        onDeleteTemplate={deleteTemplate}
        onSaveTemplate={updateTemplate}
      />
    </main>
  )
}

async function deleteProfile(language: string): ActionResponse<void> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateString(language)
    return removeProfile(client, user.sub, language)
  }))
}

async function updateProfile(input: ProfileInput): ActionResponse<Profile> {
  'use server'
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateObject(input, ProfileInputConstraints)
    return createOrModifyProfile(client, user.sub, input)
  }))
}

async function deleteTemplate(id: string): ActionResponse<void> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateString(id)
    await removeTemplate(client, user.sub, id)
  }))
}

async function updateTemplate(input: TemplateInput): ActionResponse<Template> {
  'use server'
  return await toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
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
