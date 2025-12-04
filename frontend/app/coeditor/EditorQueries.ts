import { QueryClient, useMutation, useQueryClient, useSuspenseQuery, type DefaultError, type UseMutationOptions, type UseMutationResult, type UseSuspenseQueryResult } from '@tanstack/react-query'
import type { EditorState } from './EditorState'
import { BACKEND_URL } from '../config'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template.js'
import type { DiscussionInput } from 'homeserver-backend/src/coeditor/discussion/DiscussionInput.js'
import type { CommandInput } from 'homeserver-backend/src/coeditor/command/CommandInput.js'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion.js'
import { type User } from '../general/auth/AuthContext'
import { v4 as uuid } from 'uuid'
import type { PredefinedCommandType } from 'homeserver-backend/src/coeditor/command/Command'
import { useContext, useState } from 'react'
import { InfoContext, type InfoHandler } from '../general/info/InfoContext'

export interface CommandParams extends Omit<CommandInput, 'discussion_id' | 'id' | 'template_id'> {
  discussion_id: string | undefined
  template: Template | undefined
}

export interface ExecuteCommandParams extends EditorState {
  selection_start?: number
  selection_end?: number
  customCommand?: string
  predefinedCommand?: PredefinedCommandType
}

export function useTemplateQuery(user: User | undefined): UseSuspenseQueryResult<Template[]> {
  const infoHandler = useContext(InfoContext)
  return useSuspenseQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['template', user?.accessToken],
    queryFn: async () => getTemplates(infoHandler, user?.accessToken),
    staleTime: Infinity,
  })
}

export function useDiscussionQuery(user: User | undefined, discussion_id: string | null): UseSuspenseQueryResult<Discussion | null> {
  const infoHandler = useContext(InfoContext)
  return useSuspenseQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['discussion', discussion_id, user?.accessToken],
    queryFn: async () => getDiscussion(infoHandler, user?.accessToken, discussion_id ?? undefined),
    staleTime: Infinity,
  })
}

export function useStartDiscussionMutation(user: User | undefined): UseMutationResult<Discussion, Error, CommandParams> {
  const infoHandler = useContext(InfoContext)
  return useSuspenseMutation({
    mutationFn: async (commandParams: CommandParams) => startDiscussion(infoHandler, user?.accessToken, commandParams),
  })
}

export function useExecuteCommandMutation(user: User | undefined): UseMutationResult<Discussion, Error, CommandParams> {
  const infoHandler = useContext(InfoContext)
  const queryClient = useQueryClient()
  return useSuspenseMutation({
    mutationFn: async (commandParams: CommandParams) => executeCommand(infoHandler, user?.accessToken, commandParams),
    onSettled: discussion => queryClient.setQueryData(['discussion', discussion?.id, user?.accessToken], discussion),
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

async function getTemplates(infoHandler: InfoHandler, accessToken: string | undefined): Promise<Template[]> {
  const url = `${BACKEND_URL}api/coeditor/templates`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (response.ok) return await response.json() as Template[]
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not fetch templates: ${response.status.toString()} ${response.statusText}`)
  return []
}

async function getDiscussion(infoHandler: InfoHandler, accessToken: string | undefined, discussion_id?: string): Promise<Discussion | null>
async function getDiscussion(infoHandler: InfoHandler, accessToken: string | undefined, discussion_id: string): Promise<Discussion>
async function getDiscussion(infoHandler: InfoHandler, accessToken: string | undefined, discussion_id: string | undefined): Promise<Discussion | null> {
  if (!discussion_id) return null
  const url = `${BACKEND_URL}api/coeditor/discussions/${discussion_id}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (response.ok) return await response.json() as Discussion
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not load existing discussion: ${response.status.toString()} ${response.statusText}`)
  return { id: '', template_id: '', parameters: {}, text: '', title: '', owner_id: '', created_at: '', updated_at: '', context: '' }
}

async function startDiscussion(infoHandler: InfoHandler, accessToken: string | undefined, commandParams: CommandParams): Promise<Discussion> {
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
  if (response.ok) return await response.json() as Discussion
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not start new discussion: ${response.status.toString()} ${response.statusText}`)
  return { ...input, title: '', owner_id: '', created_at: '', updated_at: '', context: '' }
}

async function executeCommand(infoHandler: InfoHandler, accessToken: string | undefined, commandParams: CommandParams): Promise<Discussion> {
  const discussion_id = commandParams.discussion_id
    ?? (await startDiscussion(infoHandler, accessToken, commandParams)).id
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
