import { IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { validateObject } from './shared/_helper/validation'
import { UserSession } from './shared/auth/auth'
import { WebSocketHandler } from './shared/_helper/websocket'
import z from 'zod'
import { Assistant, AssistantEvent, createAssistantInstance, InitialContext } from './startpage/_external/assistant'
import { logger } from './shared/logger'

interface ActiveAssistant {
  assistant: Assistant
  listener: (event: AssistantEvent) => void
  cleanupTimeout?: NodeJS.Timeout
  ws: WebSocket | undefined
}

const activeAssistants = new Map<string, ActiveAssistant>()
const ASSISTANT_TTL_MS = 5 * 60 * 1000

export function createAssistantWebSocketServer(): WebSocketHandler {
  const canHandle = (request: IncomingMessage) => request.url?.startsWith('/ws/assistant') ?? false
  const createServer = (user: UserSession) => {
    const server = new WebSocketServer({ noServer: true })
    server.on('connection', (ws) => { handleConnection(ws, user) })
    return server
  }
  return { name: 'assistant', createServer, canHandle }
}

function handleConnection(ws: WebSocket, user: UserSession): void {
  let currentUuid: string | undefined
  ws.on('message', (data: Buffer) => {
    const input = JSON.parse(data.toString()) as unknown
    const msg = validateObject(input, inputSchema)
    if (msg.type === 'initialize') currentUuid = handleInitialize(ws, msg, user)
    if (msg.type === 'reconnect') currentUuid = handleReconnect(ws, msg)
    if (msg.type === 'message') handleUserMessage(ws, msg, currentUuid)
  })
  ws.on('close', (code) => { handleConnectionClose(code, currentUuid) })
}

function handleInitialize(ws: WebSocket, msg: { type: 'initialize', initialContext: InitialContext }, user: UserSession): string {
  const uuid = crypto.randomUUID()
  const assistant = createAssistantInstance(user)
  const activeAssistant = { assistant, ws, listener: (event: AssistantEvent) => { ws.send(JSON.stringify(event)) } }
  assistant.on(activeAssistant.listener)
  assistant.init(msg.initialContext)
    .then(() => { ws.send(JSON.stringify({ type: 'initialized', uuid })) })
    .catch((e: unknown) => {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize assistant' }))
      logger.error('Error initializing assistant', e)
    })
  activeAssistants.set(uuid, activeAssistant)
  return uuid
}

function handleReconnect(ws: WebSocket, msg: { type: 'reconnect', uuid: string }): string | undefined {
  const stored = activeAssistants.get(msg.uuid)
  if (!stored) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session expired. Please start a new chat.' }))
    ws.close(4001, 'Session has expired, cannot reconnect')
    return undefined
  }
  if (stored.ws) stored.ws.close(4002, 'Reconnecting in new websocket, close this one')
  if (stored.cleanupTimeout) clearTimeout(stored.cleanupTimeout)
  stored.assistant.off(stored.listener)
  stored.ws = ws
  stored.listener = (event: AssistantEvent) => { ws.send(JSON.stringify(event)) }
  stored.assistant.on(stored.listener)
  ws.send(JSON.stringify({ type: 'reconnected' }))
  return msg.uuid
}

function handleUserMessage(ws: WebSocket, msg: { type: 'message', message: string }, uuid: string | undefined): void {
  const stored = uuid ? activeAssistants.get(uuid) : undefined
  if (!stored) {
    ws.close(4003, 'No active assistant session found for this connection. Please start a new chat.')
    return
  }
  stored.assistant.send(msg.message)
    .catch((e: unknown) => {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message to assistant' }))
      logger.error('Error sending message to assistant', e)
    })
}

function handleConnectionClose(code: number, currentUuid: string | undefined): void {
  if (!currentUuid) return
  if (code === 4001) return
  if (code === 4002) return
  if (code === 4003) return
  const stored = activeAssistants.get(currentUuid)
  if (!stored) return
  stored.assistant.off(stored.listener)
  stored.ws = undefined
  setTimeout(() => { activeAssistants.delete(currentUuid) }, ASSISTANT_TTL_MS)
}

const inputSchema = z.union([
  z.object({ type: z.literal('initialize'), initialContext: z.object({ location: z.object({ lat: z.number(), lon: z.number() }) }) }),
  z.object({ type: z.literal('reconnect'), uuid: z.string() }),
  z.object({ type: z.literal('message'), message: z.string() }),
])
