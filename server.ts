// Import only types here and import all the rest at runtime. This allows us to get better log messages if startup fails
import type { RequestHandler } from 'next/dist/server/next'
import type { Server, IncomingMessage, ServerResponse } from 'http'
import type { Logger } from 'winston'
import type { WebSocketServer } from 'ws'
import type Stream from 'stream'
import type { CookieStore, UserSession } from './app/shared/auth/auth'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

main().catch((e: unknown) => { console.error('Error starting server', e) })

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
  const server = http.createServer((req, res) => { reactRequestHandler(handler, options, req, res).catch((e: unknown) => logger.error('Error handling request', e)) })
  logger.debug(`React app created`)
  return server
}

async function reactRequestHandler(handler: RequestHandler, options: Options, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { startLogin } = await import('./app/shared/auth/auth')
  const publicDoNotLogPaths = ['/_next/', '/__nextjs_source-map', '/ws/', '/.well-known/', '/global.css', '/favicon.ico', '/sw.js', '/manifest.webmanifest', '/robots.txt', '/icon-192.png', '/icon-512.png']
  const url = new URL(req.url ?? '', `http://${options.hostname}:${options.port.toString()}`)
  const method = req.method?.toUpperCase() ?? 'GET'
  const start = Date.now()

  if (publicDoNotLogPaths.some(i => url.pathname.startsWith(i)))
    return handler(req, res)
  options.logger.debug(`${method} ${url.toString()}`)
  if (await isAllowed(req, res))
    await handler(req, res)
  else if (isXHttpRequest(req)) {
    res.writeHead(401, { 'Content-Type': 'text/plain' })
    res.end('Unauthorized')
  }
  else {
    const cookies = await parseCookie(req, res)
    const redirectTo = await startLogin(url, cookies)
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

async function isAllowed(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const { getUserSession } = await import('./app/shared/auth/auth')
  const cookies = await parseCookie(req, res)
  const session = await getUserSession(cookies)
  if (session) return true
  if (req.url?.startsWith('/shared/auth/')) return true
  return false
}

interface WebSocketHandler {
  name: string
  canHandle: (request: IncomingMessage) => boolean
  createServer: (user: UserSession) => WebSocketServer
}

async function registerWebSockets(server: Server, logger: Logger) {
  const { createAssistantWebSocketServer } = await import('./app/server')
  const webSocketHandlers: WebSocketHandler[] = [createAssistantWebSocketServer()]
  server.on('upgrade', (request, socket, head) => {
    try {
      const url = request.url
      if (!url) throw new Error('WebSocket upgrade request received without URL')
      const handler = webSocketHandlers.find(h => h.canHandle(request))
      if (!handler) return
      withAuthentication(request, socket, logger, (user) => {
        const server = handler.createServer(user)
        server.handleUpgrade(request, socket, head, (ws) => { server.emit('connection', ws, request) })
        logger.info(`WS ${url} connected`)
      })
    }
    catch (e: unknown) {
      handleWsConnectionError(e, socket, logger)
    }
  })
  logger.debug(`Registered WebSocket(s) ${webSocketHandlers.map(h => h.name).join(', ')}`)
}

function withAuthentication(req: IncomingMessage, socket: Stream.Duplex, logger: Logger, fn: (user: UserSession) => Promise<void> | void): void {
  parseCookie(req)
    .then(async (c) => {
      const { getAuthenticatedUserSession } = await import('./app/shared/auth/auth')
      const user = await getAuthenticatedUserSession('startpage', c)
      await fn(user)
    })
    .catch((e: unknown) => { handleWsConnectionError(e, socket, logger) })
}

function handleWsConnectionError(e: unknown, socket: Stream.Duplex, logger: Logger) {
  logger.warn('Error during WebSocket upgrade', e)
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
  socket.destroy()
}

async function parseCookie(req: IncomingMessage, res?: ServerResponse): Promise<CookieStore> {
  const { stringifyCookie } = await import('next/dist/compiled/@edge-runtime/cookies')

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
    set: (nameOrOptions: string | ResponseCookie, value?: string, options?: Partial<ResponseCookie>) => {
      if (!res) throw new Error('Cannot set cookie without response object')
      if (typeof nameOrOptions !== 'string') {
        res.appendHeader('Set-Cookie', stringifyCookie(nameOrOptions))
      }
      else {
        const cookie: ResponseCookie = { name: nameOrOptions, value: value ?? '', ...options }
        res.appendHeader('Set-Cookie', stringifyCookie(cookie))
      }
    },
  }
}
