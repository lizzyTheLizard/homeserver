'use server'

import { applications } from './shared/Application'
import { getAuthenticatedUserSession } from './shared/auth/auth'
import { nontransactional } from './shared/_external/db/access'
import { findFavoritesByOwner } from './startpage/_data/Favorite'
import { askAssistant, initializeConversation } from './startpage/_external/assistant/assistant'
import { ActionResponse, toResponse } from './shared/_helper/ActionResponse'
import { InitialContext, Message } from './startpage/_external/assistant/Message'
import { validateObject } from './shared/_helper/validation'
import z from 'zod'

export async function loadPortalData() {
  const user = await getAuthenticatedUserSession()

  const apps = applications
    .filter(a => user.applications.includes(a.key))
    .map(({ key, name, icon, link, description }) => ({ key, name, icon, link, description }))

  const favorites = await nontransactional(c => findFavoritesByOwner(c, user.email))

  return { apps, favorites }
}

export async function getInitialGreeting(initialContext: InitialContext): ActionResponse<{ messages: Message[], actions: string[] }> {
  return toResponse(nontransactional(async () => {
    await getAuthenticatedUserSession('startpage')
    validateObject(initialContext, InitialContextSchema)
    return initializeConversation(initialContext)
  }))
}

export async function sendMessage(messages: Message[]): ActionResponse<{ messages: Message[], actions: string[] }> {
  return toResponse(nontransactional(async () => {
    await getAuthenticatedUserSession('startpage')
    validateObject(messages, MessagesSchema)
    return await askAssistant(messages)
  }))
}

const InitialContextSchema = z.object({
  location: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
})

const MessagesSchema = z.array(z.object({
  id: z.number(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().optional(),
  actions: z.array(z.string()).optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.array(z.object()).optional(),
}))
