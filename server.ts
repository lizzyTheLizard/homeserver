// Import only types here and import all the rest at runtime. This allows us to get better log messages if startup fails
import type { NextServerOptions } from 'next/dist/server/next'
import type { Server, RequestListener, IncomingMessage } from 'http'
import type { WebSocket } from 'ws'
import type { InitialContext } from './app/startpage/_external/assistant/assistant'
import type { CookieStore } from './app/shared/auth/auth'
import type Stream from 'stream'

main().catch((e: unknown) => { console.error('> Error starting server', e) })

async function main() {
  const options = await loadConfig()
  if (options.dev) console.log('> Starting dev server. This can take a while the first time as Next.js needs to build the application')
  else console.log('> Starting production server')

  const handle = await prepareReactApp(options)
  console.log(`> React app prepared`)
  const server = await createServer(handle)
  console.log(`> HTTP server created`)
  await registerAssistantWebSocket(server)
  console.log(`> Assistant WebSocket server registered`)
  server.listen(options.port, () => {
    console.log(`> Ready on http://${options.hostname}:${options.port.toString()}`)
  })
}

async function loadConfig() {
  const fs = await import('fs')
  if (fs.existsSync('.env')) {
    const dotenv = await import('dotenv')
    const result = dotenv.config({ quiet: true })
    if (result.error) console.warn('> Warning: Could not load .env file, proceeding with environment variables only', result.error)
    else console.log(`> Loaded ${Object.keys(result.parsed ?? {}).length.toString()} environment variables from .env file`)
  }
  const dev = process.env.NODE_ENV !== 'production'
  const hostname = process.env.HOSTNAME ?? 'localhost'
  const port = parseInt(process.env.PORT ?? '3000', 10)
  return { dev, hostname, port }
}

async function prepareReactApp(options: NextServerOptions): Promise<RequestListener> {
  const next = await import('next')
  const app = next.default(options)
  await app.prepare()
  const handle = app.getRequestHandler()
  return (req, res) => void handle(req, res).catch(console.error)
}

async function createServer(handle: RequestListener): Promise<Server> {
  const http = await import('http')
  const server = http.createServer(handle)
  return server
}

async function registerAssistantWebSocket(server: Server) {
  const { WebSocketServer } = await import('ws')
  const { getAuthenticatedUserSession } = await import('./app/shared/auth/auth')
  const { createAssistantInstance } = await import('./app/startpage/_external/assistant/assistant')
  const { validateObject, validateString } = await import('./app/shared/_helper/validation')
  const z = await import('zod')

  const InitialContextSchema = z.object({
    location: z.object({
      lat: z.number(),
      lon: z.number(),
    }),
  })

  type InputSchema = { type: 'initialize', initialContext: InitialContext } | { type: 'message', message: string }

  function assistantWebSocketHandler(ws: WebSocket) {
    const assistant = createAssistantInstance()
    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as InputSchema
      if (msg.type === 'initialize') {
        validateObject(msg.initialContext, InitialContextSchema)
        assistant.init(msg.initialContext)
      }
      else {
        validateString(msg.message)
        assistant.send(msg.message)
      }
    })
    assistant.on((event) => { ws.send(JSON.stringify(event)) })
  }

  const wss = new WebSocketServer({ noServer: true })
  wss.on('connection', (ws) => { assistantWebSocketHandler(ws) })
  server.on('upgrade', (request, socket, head) => {
    const cookies = parseCookie(request)
    getAuthenticatedUserSession('startpage', cookies).then(() => {
      if (request.url?.startsWith('/ws/assistant')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request)
        })
      }
    }).catch((e: unknown) => { handleWsConnectionError(e, socket) })
  })
  console.log(`> Assistant WebSocket server set up at /ws/assistant`)
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

function handleWsConnectionError(e: unknown, socket: Stream.Duplex) {
  console.error('> Error during WebSocket upgrade', e)
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
  socket.destroy()
}
