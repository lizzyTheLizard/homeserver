// Import only types here and import all the rest at runtime. This allows us to get better log messages if startup fails
import type { RequestHandler } from 'next/dist/server/next'
import type { Server, IncomingMessage, ServerResponse } from 'http'
import type { Logger } from 'winston'
import type { WebSocketServer } from 'ws'
import type { output } from 'zod/v4/core'
import type Stream from 'stream'
import type { CookieStore } from './app/shared/auth/auth'

main().catch((e: unknown) => { console.error('> Error starting server', e) })

async function main() {
  const options = await loadConfig()
  const server = await createReactApp(options, options.logger)
  await registerWebSockets(server, options.logger)
  server.listen(options.port, () => {
    options.logger.info(`Application ready on http://${options.hostname}:${options.port.toString()}`)
  })
}

interface Options {
  dev: boolean
  hostname: string
  port: number
  logger: Logger
}

async function loadConfig(): Promise<Options> {
  const fs = await import('fs')
  if (fs.existsSync('.env')) {
    const dotenv = await import('dotenv')
    const result = dotenv.config({ quiet: true })
    if (result.error) console.warn('Warning: Could not load existring .env file, proceeding with environment variables only', result.error)
    else console.info(`Loaded ${Object.keys(result.parsed ?? {}).length.toString()} environment variables from .env file`)
  }
  const { logger } = await import('@/app/shared/logger')

  const dev = process.env.NODE_ENV !== 'production'
  if (dev)
    logger.info('Starting dev server. This can take a while the first time as Next.js needs to build the application')
  else
    logger.info('Starting production server')

  const hostname = process.env.HOSTNAME ?? 'localhost'
  const port = parseInt(process.env.PORT ?? '3000', 10)
  return { dev, hostname, port, logger }
}

async function createReactApp(options: Options, logger: Logger): Promise<Server> {
  const next = await import('next')
  const app = next.default(options)
  await app.prepare()
  const handler = app.getRequestHandler()
  const http = await import('http')
  const server = http.createServer((req, res) => { reactRequestHandler(handler, options, req, res).catch(logger.error) })
  logger.debug(`React app created`)
  return server
}

async function reactRequestHandler(handler: RequestHandler, options: Options, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { startLogin } = await import('./app/shared/auth/auth')
  const publicDoNotLogPaths = ['/_next/', '/__nextjs_source-map.js', '/ws/', '/.well-known/', '/global.css', '/favicon.ico', '/sw.js']
  const url = new URL(req.url ?? '', `http://${options.hostname}:${options.port.toString()}`)
  const method = req.method?.toUpperCase() ?? 'GET'
  const start = Date.now()

  if (publicDoNotLogPaths.some(i => url.pathname.startsWith(i)))
    return handler(req, res)
  options.logger.debug(`${method} ${url.toString()}`)
  if (await isAllowed(req))
    await handler(req, res)
  else if (isXHttpRequest(req)) {
    res.writeHead(401, { 'Content-Type': 'text/plain' })
    res.end('Unauthorized')
  }
  else {
    const redirectTo = await startLogin(url)
    res.writeHead(302, { Location: redirectTo.href })
    res.end()
  }
  const duration = (Date.now() - start).toString()
  options.logger.info(`${method} ${url.pathname} answered with ${res.statusCode.toString()} in (${duration}ms)`)
}

function isXHttpRequest(req: IncomingMessage): boolean {
  const requestWithHeaders = req.headers['x-requested-with']
  if (requestWithHeaders && typeof requestWithHeaders === 'string') {
    return requestWithHeaders.toLowerCase() === 'xmlhttprequest'
  }
  return requestWithHeaders?.includes('XMLHttpRequest') ?? false
}

async function isAllowed(req: IncomingMessage): Promise<boolean> {
  const { getUserSession } = await import('./app/shared/auth/auth')
  const cookies = parseCookie(req)
  const session = await getUserSession(cookies)
  if (session) return true
  if (req.url?.startsWith('/shared/auth/')) return true
  return false
}

async function registerWebSockets(server: Server, logger: Logger) {
  const { getAuthenticatedUserSession } = await import('./app/shared/auth/auth')

  const webSocketHandlers = [await createAssistantWebSocketServer(logger)]

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = request.url
      if (!url) throw new Error('WebSocket upgrade request received without URL')
      const handler = webSocketHandlers.find(h => h.canHandle(request))
      if (!handler) return
      const cookies = parseCookie(request)
      getAuthenticatedUserSession('startpage', cookies)
        .then(() => { handler.server.handleUpgrade(request, socket, head, (ws) => { handler.server.emit('connection', ws, request) }) })
        .then(() => { logger.info(`WS ${url} connected`) })
        .catch((e: unknown) => { handleWsConnectionError(e, socket, logger) })
    }
    catch (e: unknown) {
      handleWsConnectionError(e, socket, logger)
    }
  })
  logger.debug(`Set up ${webSocketHandlers.length.toString()} WebSocket handlers`)
}

function handleWsConnectionError(e: unknown, socket: Stream.Duplex, logger: Logger) {
  logger.warn('Error during WebSocket upgrade', e)
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
  socket.destroy()
}

function parseCookie(req: IncomingMessage): CookieStore {
  const cookiesHeader = req.headers.cookie
  const cookies: Record<string, string> = {}
  if (cookiesHeader) {
    cookiesHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.split('=')
      cookies[name.trim()] = rest.join('=').trim()
    })
  }
  return {
    get: (name: string) => ({ name, value: cookies[name] }),
    set: () => { throw new Error('Cookie setting is not supported in this context') },
  }
}

async function createAssistantWebSocketServer(logger: Logger): Promise<{ server: WebSocketServer, canHandle: (request: IncomingMessage) => boolean }> {
  const { WebSocketServer } = await import('ws')
  const { createAssistantInstance } = await import('./app/startpage/_external/assistant')
  const { validateObject } = await import('./app/shared/_helper/validation')
  const z = await import('zod')

  const inputSchema = z.union([
    z.object({ type: z.literal('initialize'), initialContext: z.object({ location: z.object({ lat: z.number(), lon: z.number() }) }) }),
    z.object({ type: z.literal('message'), message: z.string() }),
  ])

  const canHandle = (request: IncomingMessage) => request.url?.startsWith('/ws/assistant') ?? false
  const server = new WebSocketServer({ noServer: true })
  server.on('connection', (ws) => {
    const assistant = createAssistantInstance()
    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as output<typeof inputSchema>
      validateObject(msg, inputSchema)
      if (msg.type === 'initialize')
        assistant.init(msg.initialContext).catch((e: unknown) => { logger.error('Error initializing assistant', e) })
      else
        assistant.send(msg.message).catch((e: unknown) => { logger.error('Error sending message to assistant', e) })
    })
    assistant.on((event) => { ws.send(JSON.stringify(event)) })
  })
  logger.debug(`Assistant websocket set up at /ws/assistant`)
  return { server, canHandle }
}
