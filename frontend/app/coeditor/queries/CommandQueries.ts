import { useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { BACKEND_URL } from '../../config'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template.js'
import type { CommandInput } from 'homeserver-backend/src/coeditor/command/CommandInput.js'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion.js'
import { type User } from '../../general/auth/AuthContext'
import { v4 as uuid } from 'uuid'
import { useContext } from 'react'
import { InfoContext, type InfoHandler } from '../../general/info/InfoContext'
import { useSuspenseMutation } from './useSuspenseMutation'
import { startDiscussion } from './DiscussionQueries'

export interface CommandParams extends Omit<CommandInput, 'discussion_id' | 'id' | 'template_id'> {
  discussion_id: string | undefined
  template: Template | undefined
}

export function useExecuteCommandMutation(user: User | undefined): UseMutationResult<Discussion, Error, CommandParams> {
  const infoHandler = useContext(InfoContext)
  const queryClient = useQueryClient()
  return useSuspenseMutation({
    mutationFn: async (commandParams: CommandParams) => executeCommand(infoHandler, user?.accessToken, commandParams),
    onSettled: discussion => queryClient.setQueryData(['discussion', user?.accessToken, discussion?.id], discussion),
  })
}

async function executeCommand(infoHandler: InfoHandler, accessToken: string | undefined, commandParams: CommandParams): Promise<Discussion> {
  const discussion_id = commandParams.discussion_id ?? (await startDiscussion(infoHandler, accessToken, commandParams)).id
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { template: _unused, ...rest } = commandParams
  const input = { ...rest, id: uuid(), discussion_id: discussion_id, template_id: commandParams.template?.id }
  const url = `${BACKEND_URL}api/coeditor/commands`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
    body: JSON.stringify(input),
  })
  if (response.ok) return await response.json() as Discussion
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not execute command: ${response.status.toString()} ${response.statusText}`)
  return { ...commandParams, id: discussion_id, template_id: commandParams.template?.id ?? '', title: '', owner_id: '', created_at: '', updated_at: '', context: '' }
}
