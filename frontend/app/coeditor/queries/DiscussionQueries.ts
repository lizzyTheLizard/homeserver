import { type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { BACKEND_URL } from '../../config'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template.js'
import type { DiscussionInput } from 'homeserver-backend/src/coeditor/discussion/DiscussionInput.js'
import type { CommandInput } from 'homeserver-backend/src/coeditor/command/CommandInput.js'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion.js'
import { type User } from '../../general/auth/AuthContext'
import { v4 as uuid } from 'uuid'
import { useContext } from 'react'
import { InfoContext, type InfoHandler } from '../../general/info/InfoContext'
import { useLoadingMutation, useLoadingQuery } from '../../general/loading/LoadingContext'

export interface StartDiscussionParams extends Omit<CommandInput, 'discussion_id' | 'id' | 'template_id'> {
  discussion_id: string | undefined
  template: Template | undefined
}

export function useDiscussionQuery(user: User | undefined, discussion_id: string | null): UseQueryResult<Discussion | null> {
  const infoHandler = useContext(InfoContext)
  return useLoadingQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['discussion', user?.accessToken, discussion_id],
    queryFn: async () => getDiscussion(infoHandler, user?.accessToken, discussion_id ?? undefined),
    staleTime: Infinity,
  })
}

export function useDiscussionsQuery(user: User | undefined): UseQueryResult<Discussion[]> {
  const infoHandler = useContext(InfoContext)
  return useLoadingQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['discussion', user?.accessToken],
    queryFn: async () => getDiscussions(infoHandler, user?.accessToken),
    staleTime: Infinity,
  })
}

export function useStartDiscussionMutation(user: User | undefined): UseMutationResult<Discussion, Error, StartDiscussionParams> {
  const infoHandler = useContext(InfoContext)
  return useLoadingMutation({
    mutationFn: async (params: StartDiscussionParams) => startDiscussion(infoHandler, user?.accessToken, params),
  })
}

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

async function getDiscussions(infoHandler: InfoHandler, accessToken: string | undefined): Promise<Discussion[]> {
  const url = `${BACKEND_URL}api/coeditor/discussions`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (response.ok) return await response.json() as Discussion[]
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not load existing discussions: ${response.status.toString()} ${response.statusText}`)
  return []
}

export async function startDiscussion(infoHandler: InfoHandler, accessToken: string | undefined, params: StartDiscussionParams): Promise<Discussion> {
  if (params.discussion_id) throw new Error('Discussion ID already exists')
  if (!params.template) throw new Error('Template is required to start a discussion')
  const input: DiscussionInput = {
    id: uuid(),
    template_id: params.template.id,
    parameters: params.parameters,
    text: params.text,
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
