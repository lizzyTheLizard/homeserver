import { IncomingMessage } from 'http'
import { WebSocketServer } from 'ws'
import z, { output } from 'zod'
import { createAssistantInstance } from './startpage/_external/assistant'
import { logger } from '@/app/shared/logger'
import { validateObject } from './shared/_helper/validation'

export function createAssistantWebSocketServer(): { name: string, server: WebSocketServer, canHandle: (request: IncomingMessage) => boolean } {
  const inputSchema = z.union([
    z.object({ type: z.literal('initialize'), initialContext: z.object({ location: z.object({ lat: z.number(), lon: z.number() }) }) }),
    z.object({ type: z.literal('message'), message: z.string(), selection: z.object({ start: z.number(), end: z.number(), text: z.string() }).optional() }),
  ])

  const canHandle = (request: IncomingMessage) => request.url?.startsWith('/ws/assistant') ?? false
  const server = new WebSocketServer({ noServer: true })
  server.on('connection', (ws) => {
    const assistant = createAssistantInstance()
    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as output<typeof inputSchema>
      validateObject(msg, inputSchema)
      if (msg.type === 'initialize')
        assistant.init(msg.initialContext).catch((e: unknown) => {
          ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize assistant' }))
          logger.error('Error initializing assistant', e)
        })
      else
        assistant.send(msg.message, msg.selection).catch((e: unknown) => {
          ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message to assistant' }))
          logger.error('Error sending message to assistant', e)
        })
    })
    assistant.on((event) => { ws.send(JSON.stringify(event)) })
  })
  return { name: 'assistant', server, canHandle }
}
