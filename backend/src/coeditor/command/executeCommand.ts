import type { PoolClient } from 'pg'
import type { Context } from '../../Context.js'
import type { Discussion } from '../discussion/Discussion.js'
import { expectedError } from '../../BackendError.js'
import { createContextString } from '../template/extractParameters.js'
import { CommandInputConstraints, type CommandInput } from './CommandInput.js'
import { aiPort } from './aiPort.js'
import { validate } from 'validate.js'
import { findDiscussionById } from '../discussion/getDiscussion.js'
import { findTemplateById } from '../template/getTemplates.js'
import { findCommandsBydiscussion_id } from './getCommand.js'
import type { Template } from '../template/Template.js'
import { findProfileByUserAndLanguage } from '../profile/getProfiles.js'
import type { Command, CommandWithoutResult } from './Command.js'
import type { Profile } from '../profile/Profile.js'

export async function executeCommand(context: Context, input: unknown): Promise<Discussion> {
  console.log('Executing command for ' + context.user.email)
  if (!validateInput(input)) throw expectedError('Invalid command input', 400, 'Bad Request')
  return context.db.inTransaction<Discussion>(async (client) => {
    const discussion = await getDiscussionSafe(client, input.discussion_id, context.user.email)
    const template = await getTemplateSafe(client, input.template_id, context.user.email)
    const profile = await findProfileByUserAndLanguage(client, context.user.email, template.language)
    const newCommandWithoutResult = createNewCommand(input, discussion, template, profile)
    const commandsSoFarResult = await findCommandsBydiscussion_id(client, input.discussion_id)
    const aiOutput = await aiPort(newCommandWithoutResult, commandsSoFarResult)
    const command = { ...newCommandWithoutResult, result: aiOutput }
    await insertCommand(client, command)
    return await updateDiscussion(client, input, command)
  })
}

function validateInput(input: unknown): input is CommandInput {
  const result = validate(input, CommandInputConstraints, { format: 'flat' }) as string[] | undefined
  const inputObj = input as CommandInput
  if (!inputObj.predefinedCommand && !inputObj.customCommand)
    throw expectedError('No command given', 400)
  if (!result?.[0]) return true
  throw expectedError(result[0], 400)
}

async function getDiscussionSafe(client: PoolClient, discussion_id: string, user: string): Promise<Discussion> {
  const discussion = await findDiscussionById(client, discussion_id)
  if (!discussion)
    throw expectedError(`Discussion '${discussion_id}' Not Found`, 404, 'Discussion Not Found')
  if (discussion.owner_id !== user)
    throw expectedError(`You do not have permission to modify discussion '${discussion_id}'`, 403, 'Forbidden')
  return discussion
}

async function getTemplateSafe(client: PoolClient, template_id: string, user: string): Promise<Template> {
  const template = await findTemplateById(client, template_id)
  if (!template)
    throw expectedError(`Template '${template_id}' Not Found`, 404, 'Template Not Found')
  if (template.owner_id !== user)
    throw expectedError(`You do not have permission to read template '${template_id}'`, 403, 'Forbidden')
  return template
}

function createNewCommand(input: CommandInput, discussion: Discussion, template: Template, profile?: Profile): CommandWithoutResult {
  return {
    id: input.id,
    discussion_id: input.discussion_id,
    template_id: input.template_id,
    text: input.text,
    context: createContextString(template, input.parameters),
    selection_start: input.selectionStart,
    selection_end: input.selectionEnd,
    predefined_command: input.predefinedCommand,
    custom_command: input.customCommand,
    title: discussion.title,
    language: template.language,
    profile: profile?.text,
  }
}

async function insertCommand(client: PoolClient, command: Command): Promise<void> {
  await client.query(
    'INSERT INTO command (id, discussion_id, template_id, text, title, context, profile, selection_start, selection_end, custom_command, predefined_command, result, language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
    [command.id, command.discussion_id, command.template_id, command.text, command.title, command.context, command.profile, command.selection_start, command.selection_end, command.custom_command, command.predefined_command, JSON.stringify(command.result), command.language],
  )
}

async function updateDiscussion(client: PoolClient, input: CommandInput, command: Command): Promise<Discussion> {
  const result = await client.query<Discussion>(
    'UPDATE discussion SET text = $1, context = $2, template_id = $3, parameters = $4, title = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
    [command.result.newText, command.context, command.template_id, input.parameters, command.result.newTitle, command.discussion_id])
  if (!result.rows[0]) throw expectedError('Failed to update discussion', 500, 'Internal Server Error')
  return result.rows[0]
}
