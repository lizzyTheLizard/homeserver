'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Discussion, findDiscussionById } from '../_data/Discussion'
import { findTemplatesByOwner, Template } from '../_data/Template'
import { nontransactional, transactional } from '@/app/shared/db'
import notFound from './not-found'
import { logger } from '@/app/shared/logger'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { CommandInput, executeCommand } from '../_data/Command'
import { validateObject } from '@/app/shared/_helper/validation'

export interface EditorDate {
  discussion: Discussion | undefined
  templates: Template[]
}

export async function loadEditorData(discussionId?: string): Promise<EditorDate> {
  const user = await getAuthenticatedUserSession('cash')
  const [discussion, templates] = await nontransactional(async c => ([
    discussionId ? await findDiscussionById(c, user.sub, discussionId) : undefined,
    await findTemplatesByOwner(c, user.sub),
  ]))
  if (discussionId && !discussion) {
    logger.info(`Discussion with id ${discussionId} not found for user ${user.sub}`)
    notFound()
  }
  if (discussion && discussion.owner_id !== user.sub) {
    logger.info(`User ${user.sub} not authorized for discussion with id ${discussion.id}`)
    notFound()
  }
  return { discussion, templates }
}

export async function executeCommandAction(input: CommandInput): ActionResponse<Discussion> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession('cash')
    validateObject(input, CommandInputConstraints)
    return executeCommand(tx, user.sub, input)
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
