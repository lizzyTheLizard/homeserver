import { useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { BACKEND_URL } from '../../config'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template.js'
import type { TemplateInput } from 'homeserver-backend/src/coeditor/template/TemplateInput.js'
import { type User } from '../../general/auth/AuthContext'
import { useContext } from 'react'
import { InfoContext, type InfoHandler } from '../../general/info/InfoContext'
import { useLoadingMutation, useLoadingQuery } from '../../general/loading/LoadingContext'

export function useTemplateQuery(user: User | undefined): UseQueryResult<Template[]> {
  const infoHandler = useContext(InfoContext)
  return useLoadingQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['template', user?.accessToken],
    queryFn: async () => getTemplates(infoHandler, user?.accessToken),
    staleTime: Infinity,
  })
}

export function useSaveTemplateMutation(user: User | undefined): UseMutationResult<void, Error, TemplateInput> {
  const infoHandler = useContext(InfoContext)
  const queryClient = useQueryClient()
  return useLoadingMutation({
    mutationFn: async (template: TemplateInput) => saveTemplate(infoHandler, user?.accessToken, template),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['template', user?.accessToken] }),
  })
}

export function useDeleteTemplateMutation(user: User | undefined): UseMutationResult<void, Error, string> {
  const infoHandler = useContext(InfoContext)
  const queryClient = useQueryClient()
  return useLoadingMutation({
    mutationFn: async (template_id: string) => deleteTemplate(infoHandler, user?.accessToken, template_id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['template', user?.accessToken] }),
  })
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

async function saveTemplate(infoHandler: InfoHandler, accessToken: string | undefined, template: TemplateInput): Promise<void> {
  const url = `${BACKEND_URL}api/coeditor/templates`
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
    body: JSON.stringify(template),
  })
  if (response.ok) return
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not save template: ${response.status.toString()} ${response.statusText}`)
}

async function deleteTemplate(infoHandler: InfoHandler, accessToken: string | undefined, template_id: string): Promise<void> {
  const url = `${BACKEND_URL}api/coeditor/templates/${encodeURIComponent(template_id)}`
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (response.ok) return
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not delete template: ${response.status.toString()} ${response.statusText}`)
}
