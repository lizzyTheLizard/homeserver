import { QueryClient, useMutation, useSuspenseQuery, type DefaultError, type UseMutationOptions, type UseMutationResult, type UseSuspenseQueryResult } from '@tanstack/react-query'
import type { EditorState } from './EditorState'
import { BACKEND_URL } from '../config'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template.js'
import type { DiscussionInput } from 'homeserver-backend/src/coeditor/discussion/DiscussionInput.js'
import type { CommandInput } from 'homeserver-backend/src/coeditor/command/CommandInput.js'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion.js'
import type { User } from '../general/auth/AuthContext'
import { v4 as uuid } from 'uuid'
import type { PredefinedCommandType } from 'homeserver-backend/src/coeditor/command/Command'
import { useState } from 'react'

export interface CommandParams extends Omit<CommandInput, 'discussion_id' | 'id' | 'template_id'> {
  discussion_id: string | undefined
  template: Template | undefined
}

export interface ExecuteCommandParams extends EditorState {
  selectionStart?: number
  selectionEnd?: number
  customCommand?: string
  predefinedCommand?: PredefinedCommandType
}

export function useTemplateQuery(user: User | undefined): UseSuspenseQueryResult<Template[]> {
  return useSuspenseQuery({
    queryKey: ['template', user?.accessToken],
    queryFn: async () => getTemplates(user?.accessToken),
  })
}

export function useDiscussionQuery(user: User | undefined, discussion_id: string): UseSuspenseQueryResult<Discussion> {
  return useSuspenseQuery({
    queryKey: ['discussion', discussion_id, user?.accessToken],
    queryFn: async () => getDiscussion(user?.accessToken, discussion_id),
  })
}

export function useStartDiscussionMutation(user: User | undefined): UseMutationResult<Discussion, Error, CommandParams> {
  return useSuspenseMutation({
    mutationFn: async (commandParams: CommandParams) => startDiscussion(user?.accessToken, commandParams),
  })
}

export function useExecuteCommandMutation(user: User | undefined): UseMutationResult<Discussion, Error, CommandParams> {
  return useSuspenseMutation({
    mutationFn: async (commandParams: CommandParams) => executeCommand(user?.accessToken, commandParams),
  })
}

function useSuspenseMutation<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>(options: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>, queryClient?: QueryClient): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  // This is a hack as tanstack/react-query does not provide a useSuspenseMutation hook. It will not work perfectly in all cases.
  const [endSuspenseFunction, setEndSuspenseFunction] = useState<(() => void) | undefined>(undefined)

  const onSettled: typeof options.onSettled = (d, e, v, o, c) => {
    endSuspenseFunction?.()
    return options.onSettled?.(d, e, v, o, c)
  }

  const mutation = useMutation({ ...options, onSettled }, queryClient)
  if (mutation.isPending) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Promise<void>((resolve) => {
      setEndSuspenseFunction(() => { resolve() })
    })
  }
  return mutation
}

async function getTemplates(accessToken: string | undefined): Promise<Template[]> {
  const url = `${BACKEND_URL}api/coeditor/templates`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (!response.ok)
    throw new Error(`Error fetching templates: ${response.status.toString()} ${response.statusText}`)
  return await response.json() as Template[]
}

async function getDiscussion(accessToken: string | undefined, discussion_id: string): Promise<Discussion> {
  const url = `${BACKEND_URL}api/coeditor/discussions/${discussion_id}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (!response.ok)
    throw new Error(`Error fetching discussion ${discussion_id}: ${response.status.toString()} ${response.statusText}`)
  return await response.json() as Discussion
}

async function startDiscussion(accessToken: string | undefined, commandParams: CommandParams): Promise<Discussion> {
  if (commandParams.discussion_id) throw new Error('Discussion ID already exists')
  if (!commandParams.template) throw new Error('Template is required to start a discussion')
  const input: DiscussionInput = {
    id: uuid(),
    template_id: commandParams.template.id,
    parameters: commandParams.parameters,
    text: commandParams.text,
  }
  const url = `${BACKEND_URL}api/coeditor/discussions`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
    body: JSON.stringify(input),
  })
  if (!response.ok)
    throw new Error(`Error starting discussion ${input.id}: ${response.status.toString()} ${response.statusText}`)
  if (Object.keys(commandParams.parameters).length !== 0)
    return await executeCommand(accessToken, { ...commandParams, discussion_id: input.id, predefinedCommand: 'INITIALIZE' })
  return await response.json() as Discussion
}

async function executeCommand(accessToken: string | undefined, commandParams: CommandParams): Promise<Discussion> {
  const discussion_id = commandParams.discussion_id
    ?? (await startDiscussion(accessToken, commandParams)).id
  const input = { ...commandParams, id: uuid(), discussion_id: discussion_id }
  const url = `${BACKEND_URL}api/coeditor/commands`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
    body: JSON.stringify(input),
  })
  if (!response.ok)
    throw new Error(`Error executing command ${input.id}: ${response.status.toString()} ${response.statusText}`)
  return await response.json() as Discussion
}
