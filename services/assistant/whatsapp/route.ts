import { IncomingMessage, ServerResponse } from 'http'
import { getUserSession, parseCookieHeader, UserSession } from '../session'
import { logger } from '../logger'
import { archiveWhatsappChat, disconnectWhatsapp, getWhatsappChats, getWhatsappMessages, getWhatsappStatus, sendWhatsappMessage, startWhatsapp, triggerWhatsappFullSync } from './whatsapp'

export async function handleWhatsappApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/whatsapp')) return false
  try {
    const user = await authenticate(req)
    const handled = await route(user, req, res, pathname)
    if (!handled) {
      sendJson(res, 404, { error: 'Not found' })
    }
    return true
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    logger.warn(`WhatsApp API auth error: ${message}`)
    sendJson(res, 401, { error: message })
    return true
  }
}

async function authenticate(req: IncomingMessage): Promise<UserSession> {
  const cookieHeader = req.headers.cookie ?? ''
  const cookies = parseCookieHeader(cookieHeader)
  return await getUserSession(cookies)
}

async function route(user: UserSession, req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  const method = req.method ?? 'GET'

  if (pathname === '/whatsapp/status' && method === 'GET') {
    const status = await getWhatsappStatus(user.email)
    sendJson(res, 200, status)
    return true
  }

  if (pathname === '/whatsapp/start' && method === 'GET') {
    const status = await startWhatsapp(user.email)
    sendJson(res, 200, status)
    return true
  }

  if (pathname === '/whatsapp/chats' && method === 'GET') {
    const chats = await getWhatsappChats(user.email)
    sendJson(res, 200, chats)
    return true
  }

  if (pathname === '/whatsapp/messages' && method === 'GET') {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
    const chatId = url.searchParams.get('chatId')
    if (!chatId) {
      sendJson(res, 400, { error: 'Missing chatId' })
      return true
    }
    const messages = await getWhatsappMessages(user.email, chatId)
    sendJson(res, 200, messages)
    return true
  }

  if (pathname === '/whatsapp/send-message' && method === 'POST') {
    const body = await readJson(req, { chatId: '', text: '' })
    await sendWhatsappMessage(user.email, body.chatId, body.text)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/whatsapp/archive-chat' && method === 'POST') {
    const body = await readJson(req, { chatId: '', archived: false })
    await archiveWhatsappChat(user.email, body.chatId, body.archived)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/whatsapp/full-sync' && method === 'POST') {
    await triggerWhatsappFullSync(user.email)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/whatsapp/disconnect' && method === 'POST') {
    await disconnectWhatsapp(user.email)
    sendJson(res, 200, { success: true })
    return true
  }

  return false
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(data))
}

async function readJson<T>(req: IncomingMessage, defaults: T): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) as T : defaults
        resolve({ ...defaults, ...parsed })
      }
      catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    req.on('error', reject)
  })
}
