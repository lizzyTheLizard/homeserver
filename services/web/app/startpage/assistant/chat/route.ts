import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserSession } from '@/app/shared/auth/auth'
import type { UserSession } from '@/app/shared/auth/session'
import { logger } from '@/app/shared/logger'
import { createConversation, findConversation } from './conversations'
import { streamChatAction } from './chatStream'
import type { ChatAction } from './chatStream'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request): Promise<Response> {
  const user = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!user.applications.includes('startpage')) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const body = bodySchema.safeParse(await readJson(request))
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  return body.data.type === 'start' ? startConversation(user, request.signal, body.data.initialContext) : continueConversation(user, request.signal, body.data)
}

function startConversation(user: UserSession, signal: AbortSignal, initialContext: z.infer<typeof initialContextSchema>): Response {
  logger.debug(`Starting assistant conversation for ${user.email}`)
  const conversation = createConversation(user)
  return ndjson(streamChatAction(conversation, { type: 'start', initialContext }, signal))
}

function continueConversation(user: UserSession, signal: AbortSignal, body: { uuid: string; message: string }): Response {
  const conversation = findConversation(body.uuid, user)
  if (!conversation) return NextResponse.json({ error: 'Conversation is gone' }, { status: 410 })
  if (conversation.busy) return NextResponse.json({ error: 'The previous answer is still running' }, { status: 409 })
  const action: ChatAction = { type: 'message', message: body.message }
  return ndjson(streamChatAction(conversation, action, signal))
}

function ndjson(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

const initialContextSchema = z.object({ location: z.object({ lat: z.number(), lon: z.number() }) })

const bodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), initialContext: initialContextSchema }),
  z.object({ type: z.literal('message'), uuid: z.string(), message: z.string() }),
])
