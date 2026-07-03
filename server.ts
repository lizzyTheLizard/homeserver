// Import only types here and import all the rest at runtime. This allows us to get better log messages if startup fails
import type { InitialContext } from './app/startpage/_external/assistant'
import type { CookieStore } from './app/shared/auth/auth'
import type { NextServerOptions } from 'next/dist/server/next'
import type { Server, RequestListener, IncomingMessage } from 'http'
import type { Logger } from 'winston'
import type { WebSocket } from 'ws'
import type Stream from 'stream'

main().catch((e: unknown) => { console.error('> Error starting server', e) })

async function main() {
  console.log('Starting gutschi.site...')
  const options = await loadConfig()
  if (options.dev)
    options.logger.debug('Starting dev server. This can take a while the first time as Next.js needs to build the application')

  const handle = await prepareReactApp(options, options.logger)
  const server = await createServer(handle, options.logger)
  await registerAssistantWebSocket(server, options.logger)
  server.listen(options.port, () => {
    options.logger.info(`Application ready on http://${options.hostname}:${options.port.toString()}`)
  })
}

async function loadConfig() {
  const fs = await import('fs')
  if (fs.existsSync('.env')) {
    const dotenv = await import('dotenv')
    const result = dotenv.config({ quiet: true })
    if (result.error) console.warn('Warning: Could not load existring .env file, proceeding with environment variables only', result.error)
    else console.info(`Loaded ${Object.keys(result.parsed ?? {}).length.toString()} environment variables from .env file`)
  }
  const { logger } = await import('@/app/shared/logger')

  const dev = process.env.NODE_ENV !== 'production'
  const hostname = process.env.HOSTNAME ?? 'localhost'
  const port = parseInt(process.env.PORT ?? '3000', 10)
  return { dev, hostname, port, logger }
}

async function prepareReactApp(options: NextServerOptions, logger: Logger): Promise<RequestListener> {
  const next = await import('next')
  const app = next.default(options)
  await app.prepare()
  const handle = app.getRequestHandler()
  logger.debug(`React app prepared`)
  return (req, res) => void handle(req, res).catch(logger.error)
}

async function createServer(handle: RequestListener, logger: Logger): Promise<Server> {
  const http = await import('http')
  const server = http.createServer(handle)
  logger.debug(`HTTP server created`)
  return server
}

async function registerAssistantWebSocket(server: Server, logger: Logger) {
  const { WebSocketServer } = await import('ws')
  const { getAuthenticatedUserSession } = await import('./app/shared/auth/auth')
  const { createAssistantInstance } = await import('./app/startpage/_external/assistant')
  const { validateObject, validateString } = await import('./app/shared/_helper/validation')

  const z = await import('zod')
  const InitialContextSchema = z.object({ location: z.object({ lat: z.number(), lon: z.number() }) })
  type InputSchema = { type: 'initialize', initialContext: InitialContext } | { type: 'message', message: string }

  function assistantWebSocketHandler(ws: WebSocket) {
    const assistant = createAssistantInstance()
    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as InputSchema
      if (msg.type === 'initialize') {
        validateObject(msg.initialContext, InitialContextSchema)
        assistant.init(msg.initialContext).catch((e: unknown) => { logger.error('> Assistant init error', e) })
      }
      else {
        validateString(msg.message)
        assistant.send(msg.message).catch((e: unknown) => { logger.error('> Assistant send error', e) })
      }
    })
    assistant.on((event) => { ws.send(JSON.stringify(event)) })
  }

  const assistantSocket = new WebSocketServer({ noServer: true })
  assistantSocket.on('connection', (ws) => { assistantWebSocketHandler(ws) })

  server.on('upgrade', (request, socket, head) => {
    const cookies = parseCookie(request)
    getAuthenticatedUserSession('startpage', cookies).then(() => {
      if (request.url?.startsWith('/ws/assistant')) {
        assistantSocket.handleUpgrade(request, socket, head, ws => assistantSocket.emit('connection', ws, request))
      }
    }).catch((e: unknown) => { handleWsConnectionError(e, socket, logger) })
  })
  logger.debug(`Assistant WebSocket server set up at /ws/assistant`)
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

function handleWsConnectionError(e: unknown, socket: Stream.Duplex, logger: Logger) {
  logger.error('> Error during WebSocket upgrade', e)
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
  socket.destroy()
}
