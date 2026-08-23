import { createServer, IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import { WebSocketServer, WebSocket } from 'ws'
import { getUserSession, parseCookieHeader, UserSession } from './session'
import { logger } from './logger'
import { createAssistantInstance } from './assistant'
import { Assistant, AssistantEvent, InitialContext } from './types'
import { handleMicrosoftApi } from './microsoft/route'
import { handleWhatsappApi } from './whatsapp/route'
import z from 'zod'

interface ActiveAssistant {
  assistant: Assistant
  listener: (event: AssistantEvent) => void
  cleanupTimeout?: NodeJS.Timeout
  ws: WebSocket | undefined
}

const activeAssistants = new Map<string, ActiveAssistant>()
const ASSISTANT_TTL_MS = 5 * 60 * 1000

try {
  main()
}
catch (e: unknown) {
  console.error('Error starting assistant', e)
}

function main() {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok')
      return
    }
    const pathname = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`).pathname
    handleMicrosoftApi(req, res, pathname)
      .then((handled) => {
        if (handled) return true
        return handleWhatsappApi(req, res, pathname)
      })
      .then((handled) => {
        if (!handled) {
          res.writeHead(404).end()
        }
      })
      .catch((e: unknown) => {
        logger.error('Error handling assistant request', e)
        res.writeHead(500).end('Internal Server Error')
      })
  })

  server.on('upgrade', (request, socket, head) => {
    handleUpgrade(request, socket, head).catch((e: unknown) => {
      logger.warn('Error during WebSocket upgrade', e)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    })
  })

  const hostname = process.env.HOSTNAME ?? '0.0.0.0'
  const port = parseInt(process.env.PORT ?? '8500', 10)
  server.listen(port, hostname, () => {
    logger.info(`Assistant ready on http://${hostname}:${port.toString()}`)
  })
}

async function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
  const url = request.url
  if (!url?.startsWith('/ws/assistant')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
    socket.destroy()
    return
  }
  const user = await authenticate(request)
  const wsServer = new WebSocketServer({ noServer: true })
  wsServer.on('connection', (ws) => { handleConnection(ws, user) })
  wsServer.handleUpgrade(request, socket, head, (ws) => { wsServer.emit('connection', ws, request) })
}

async function authenticate(request: IncomingMessage): Promise<UserSession> {
  const cookieHeader = request.headers.cookie ?? ''
  const cookies = parseCookieHeader(cookieHeader)
  return getUserSession(cookies)
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

function validateObject<T extends z.ZodType>(input: unknown, schema: T): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) throw new Error('Invalid input')
  return result.data
}

const inputSchema = z.union([
  z.object({ type: z.literal('initialize'), initialContext: z.object({ location: z.object({ lat: z.number(), lon: z.number() }) }) }),
  z.object({ type: z.literal('reconnect'), uuid: z.string() }),
  z.object({ type: z.literal('message'), message: z.string() }),
])
