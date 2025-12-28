import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Discussion, findDiscussionById } from '../Discussion'
import { findTemplatesByOwner } from '../Template'
import { Editor } from './Editor'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'
import { CommandInput, executeCommand } from '../Command'
import { validateObject } from '@/app/shared/validation'

export const metadata: Metadata = {
  title: 'CoEditor',
}

export default async function Page({ searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getAuthenticatedUserSession()
  const existingDiscussionId = (await searchParams).id as string | undefined
  const { discussion, templates } = await transactional(async (client) => {
    const discussion = existingDiscussionId ? await findDiscussionById(client, user.sub, existingDiscussionId) : undefined
    if (existingDiscussionId && !discussion) throw new Error('Discussion not found')
    if (discussion && discussion.owner_id !== user.sub) throw new Error('Unauthorized')
    const templates = await findTemplatesByOwner(client, user.sub)
    return { discussion, templates }
  })

  return (
    <main>
      <h1>CoEditor</h1>
      <Editor discussion={discussion} templates={templates} executeCommand={executeCommandAction} />
    </main>
  )
}

async function executeCommandAction(input: CommandInput): ActionResponse<Discussion> {
  'use server'
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession()
    validateObject(input, CommandInputConstraints)
    return executeCommand(client, user.sub, input)
  }))
}

const CommandInputConstraints = {
  id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  discussion_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  template_id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  text: {
    presence: { allowEmpty: true },
    type: 'string',
  },
  parameters: {
    presence: true,
    type: 'object',
  },
  selection_start: {
    presence: false,
    type: 'number',
  },
  selection_end: {
    presence: false,
    type: 'number',
  },
  customCommand: {
    presence: false,
    type: 'string',
  },
  predefinedCommand: {
    presence: false,
    type: 'string',
    inclusion: {
      within: ['INITIALIZE', 'IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND'],
      message: 'must be one of INITIALIZE, IMPROVE, REFORMULATE, SUMMARIZE, EXTEND',
    },
  },
}
