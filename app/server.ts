import { IncomingMessage } from 'http'
import { WebSocketServer } from 'ws'
import z, { output } from 'zod'
import { createAssistantInstance } from './startpage/_external/assistant'
import { logger } from '@/app/shared/logger'
import { validateObject } from './shared/_helper/validation'
import { UserSession } from './shared/auth/auth'

export function createAssistantWebSocketServer() {
  const inputSchema = z.union([
    z.object({ type: z.literal('initialize'), initialContext: z.object({ location: z.object({ lat: z.number(), lon: z.number() }) }) }),
    z.object({ type: z.literal('message'), message: z.string() }),
  ])

  const canHandle = (request: IncomingMessage) => request.url?.startsWith('/ws/assistant') ?? false
  const createServer = (user: UserSession) => {
    const server = new WebSocketServer({ noServer: true })
    server.on('connection', (ws) => {
      const assistant = createAssistantInstance(user)
      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString()) as output<typeof inputSchema>
        validateObject(msg, inputSchema)
        if (msg.type === 'initialize')
          assistant.init(msg.initialContext).catch((e: unknown) => {
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize assistant' }))
            logger.error('Error initializing assistant', e)
          })
        else
          assistant.send(msg.message).catch((e: unknown) => {
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message to assistant' }))
            logger.error('Error sending message to assistant', e)
          })
      })
      assistant.on((event) => { ws.send(JSON.stringify(event)) })
    })
    return server
  }
  return { name: 'assistant', createServer, canHandle }
}
