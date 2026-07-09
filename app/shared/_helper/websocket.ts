import type { IncomingMessage } from 'http'
import type { WebSocketServer } from 'ws'
import type { UserSession } from '@/app/shared/auth/auth'

export interface WebSocketHandler {
  name: string
  canHandle: (request: IncomingMessage) => boolean
  createServer: (user: UserSession) => WebSocketServer
}
