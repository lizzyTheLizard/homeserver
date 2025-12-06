import { useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { BACKEND_URL } from '../../config'
import type { Profile } from 'homeserver-backend/src/coeditor/profile/Profile.js'
import type { ProfileInput } from 'homeserver-backend/src/coeditor/profile/ProfileInput.js'
import { type User } from '../../general/auth/AuthContext'
import { useContext } from 'react'
import { InfoContext, type InfoHandler } from '../../general/info/InfoContext'
import { useLoadingMutation, useLoadingQuery } from '../../general/loading/LoadingContext'

export function useProfileQuery(user: User | undefined): UseQueryResult<Profile[]> {
  const infoHandler = useContext(InfoContext)
  return useLoadingQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['profile', user?.accessToken],
    queryFn: async () => getProfiles(infoHandler, user?.accessToken),
    staleTime: Infinity,
  })
}

export function useSaveProfileMutation(user: User | undefined): UseMutationResult<void, Error, ProfileInput> {
  const infoHandler = useContext(InfoContext)
  const queryClient = useQueryClient()
  return useLoadingMutation({
    mutationFn: async (profile: ProfileInput) => saveProfile(infoHandler, user?.accessToken, profile),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.accessToken] }),
  })
}

export function useDeleteProfileMutation(user: User | undefined): UseMutationResult<void, Error, string> {
  const infoHandler = useContext(InfoContext)
  const queryClient = useQueryClient()
  return useLoadingMutation({
    mutationFn: async (language: string) => deleteProfile(infoHandler, user?.accessToken, language),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.accessToken] }),
  })
}

async function saveProfile(infoHandler: InfoHandler, accessToken: string | undefined, profile: ProfileInput): Promise<void> {
  const url = `${BACKEND_URL}api/coeditor/profiles`
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
    body: JSON.stringify(profile),
  })
  if (response.ok) return
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not save profile: ${response.status.toString()} ${response.statusText}`)
}

async function deleteProfile(infoHandler: InfoHandler, accessToken: string | undefined, language: string): Promise<void> {
  const url = `${BACKEND_URL}api/coeditor/profiles/${encodeURIComponent(language)}`
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (response.ok) return
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not delete profile: ${response.status.toString()} ${response.statusText}`)
}

async function getProfiles(infoHandler: InfoHandler, accessToken: string | undefined): Promise<Profile[]> {
  const url = `${BACKEND_URL}api/coeditor/profiles`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: 'Bearer ' + (accessToken ?? '') },
  })
  if (response.ok) return await response.json() as Profile[]
  if (response.status === 401) infoHandler('danger', 'Session expired. Please refresh page to log in again.')
  else infoHandler('danger', `Could not fetch profiles: ${response.status.toString()} ${response.statusText}`)
  return []
}
