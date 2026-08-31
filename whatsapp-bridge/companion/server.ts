import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { config } from './config'
import { logger } from './logger'
import { Supervisor } from './supervisor'

type SessionRequest = Request<{ userId: string }>

// One supervisor per user, created lazily on first use.
const supervisors = new Map<string, Supervisor>()

const app = express()
app.use(requestTracing)
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => { res.status(200).end() })

app.get('/sessions/:userId/status', (req: SessionRequest, res) => {
  const existing = supervisors.get(req.params.userId)
  res.status(200).json(existing ? existing.getStatus() : { type: 'closed' })
})

app.post('/sessions/:userId/start', async (req: SessionRequest, res) => {
  const status = await supervisorFor(req.params.userId).start()
  res.status(200).json(status)
})

app.post('/sessions/:userId/send-message', async (req: SessionRequest, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  if (typeof body.to !== 'string' || !body.to || typeof body.text !== 'string' || !body.text) {
    res.status(400).json({ error: 'send_message: missing \'to\' or \'text\'' })
    return
  }
  await supervisorFor(req.params.userId).sendMessage(body.to, body.text)
  res.status(204).end()
})

app.post('/sessions/:userId/archive-chat', async (req: SessionRequest, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  if (typeof body.id !== 'string' || !body.id) {
    res.status(400).json({ error: 'archive_chat: missing \'id\'' })
    return
  }
  await supervisorFor(req.params.userId).archiveChat(body.id, body.archived === true)
  res.status(204).end()
})

app.post('/sessions/:userId/full-sync', async (req: SessionRequest, res) => {
  await supervisorFor(req.params.userId).fullSync()
  res.status(202).end()
})

app.post('/sessions/:userId/disconnect', async (req: SessionRequest, res) => {
  const existing = supervisors.get(req.params.userId)
  if (existing) await existing.disconnect()
  res.status(204).end()
})

app.get('/sessions/:userId/chats', async (req: SessionRequest, res) => {
  const chats = await supervisorFor(req.params.userId).getChats()
  res.status(200).json(chats)
})

app.get('/sessions/:userId/messages', async (req: SessionRequest, res) => {
  const chatId = req.query.chatId
  if (typeof chatId !== 'string' || !chatId) {
    res.status(400).json({ error: 'missing chatId query parameter' })
    return
  }
  const messages = await supervisorFor(req.params.userId).getMessages(chatId)
  res.status(200).json(messages)
})

app.use(errorHandler)

app.use((_req, res) => res.status(404).json({ error: 'not found' }))

const server = app.listen(config.PORT, () => {
  logger.info(`WhatsApp bridge companion listening on :${String(config.PORT)}`)
  logger.info(`wacli store directory: ${config.WHATSAPP_DATA_DIR}`)
})

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })

function supervisorFor(userId: string): Supervisor {
  let supervisor = supervisors.get(userId)
  if (!supervisor) {
    supervisor = new Supervisor(userId)
    supervisors.set(userId, supervisor)
  }
  return supervisor
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`received ${signal}, shutting down`)
  server.close()
  await Promise.all([...supervisors.values()].map(supervisor => supervisor.stop().catch(() => undefined)))
  process.exit(0)
}

// Request tracing: logs every inbound request and its result at debug level so
// a request can be followed end to end in the logs.
function requestTracing(req: SessionRequest, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  const label = req.params.userId ? `[${req.params.userId}] ` : ''
  logger.debug(`${label}-> ${req.method} ${req.originalUrl}`)
  res.on('finish', () => {
    logger.debug(`${label}<- ${req.method} ${req.originalUrl} ${String(res.statusCode)} (${String(Date.now() - startedAt)}ms)`)
  })
  next()
}

// Express detects error middleware by its 4-argument signature, so `next`
// must stay even though the handler writes the response itself.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err: Error, _req: SessionRequest, res: Response, _next: NextFunction) {
  logger.warn('Error while serving request', err)
  res.status(500).json({ message: err.message })
}
