import makeWASocket, { WABrowserDescription, ConnectionState } from '@whiskeysockets/baileys'
import { logger } from '@/app/shared/logger'
import { createExportableAuth } from './auth'
import { createStore } from './store'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { AuthStateInput, findAuthStateByOwner, updateAuthState } from '../../_data/Whatsapp'

export interface SyncHandler {
  start: () => void
  close: () => void
  onQrCode: (callback: (qr: string) => void) => void
  onAuth: (callback: () => void) => void
  onReady: (callback: () => void) => void
  onFinished: (callback: (error?: Error) => void) => void
}

export async function startSync(owner: string): Promise<SyncHandler> {
  let qrCodeCallback: ((qr: string) => void) | undefined
  let authCallback: (() => void) | undefined
  let readyCallback: (() => void) | undefined
  let finishedCallback: ((error?: Error) => void) | undefined
  let sock: ReturnType<typeof makeWASocket> | undefined

  const authState = await nontransactional(async c => findAuthStateByOwner(c, owner))
  let auth = createExportableAuth(authState)
  const browser = ['Gutschi.site', 'Desktop', '1.0.0'] as WABrowserDescription
  const store = createStore(owner)

  function onError(error: unknown): void {
    const arg = error instanceof Error ? error : new Error(String(error))
    logger.debug(`Closing WhatsApp sync for ${owner} due to error ${arg}`)
    close(arg)
  }

  function close(error?: Error): void {
    if (sock) {
      const sockCpy = sock
      sock = undefined
      sockCpy.end(error).catch(onClosed)
    }
    else if (finishedCallback) {
      finishedCallback(error)
    }
  }

  function onClosed(error?: Error): void {
    if (!error) {
      logger.debug(`WhatsApp sync connection closed for ${owner} without error`)
      if (finishedCallback) finishedCallback()
      return
    }
    if (isInvalidAuthError(error)) {
      logger.warn(`WhatsApp sync for ${owner} requires re-authentication due to invalid auth state`)
      auth = createExportableAuth(undefined)
      store.reset().then(start).catch(onError)
      return
    }
    if (isRequiredReconnectError(error)) {
      logger.debug(`WhatsApp sync connection closed for ${owner} due to required reconnect`)
      authCallback?.()
      store.reset().then(startAgainAfterLogin).catch(onError)
      return
    }
    if (finishedCallback) finishedCallback(error instanceof Error ? error : new Error(String(error)))
  }

  function start() {
    sock = makeWASocket({ auth, browser, logger: baileysLogger, markOnlineOnConnect: false, syncFullHistory: true, emitOwnEvents: true })
    if (!authState) credentialUpdate(owner, auth.toAuthState(), onError)
    sock.ev.on('creds.update', () => { credentialUpdate(owner, auth.toAuthState(), onError) })
    sock.ev.on('connection.update', (update) => { connectionUpdate(update, onClosed, qrCodeCallback, readyCallback) })
    store.setLidMappingStore(sock.signalRepository.lidMapping)
    store.bind(sock.ev)
  }

  function startAgainAfterLogin() {
    sock = makeWASocket({ auth, browser, logger: baileysLogger, markOnlineOnConnect: false, syncFullHistory: true, emitOwnEvents: true })
    sock.ev.on('creds.update', () => { credentialUpdate(owner, auth.toAuthState(), onError) })
    sock.ev.on('connection.update', (update) => { connectionUpdateAfterLogin(update, onClosed, onError) })
    if (readyCallback) store.onInitialSyncFinished(readyCallback)
    store.setLidMappingStore(sock.signalRepository.lidMapping)
    store.bind(sock.ev)
  }

  return {
    start: start,
    onQrCode: (callback) => { qrCodeCallback = callback },
    onAuth: (callback) => { authCallback = callback },
    onReady: (callback) => { readyCallback = callback },
    onFinished: (callback) => { finishedCallback = callback },
    close: close,
  }
}

const baileysLogger = {
  level: logger.level,
  child: () => baileysLogger,
  trace: () => { /* empty */ },
  debug: () => { /* empty */ },
  info: () => { /* empty */ },
  warn: () => { /* empty */ },
  error: () => { /* empty */ },
}

function credentialUpdate(owner: string, authState: AuthStateInput, onError: (error?: Error) => void): void {
  transactional(client => updateAuthState(client, owner, authState)).catch(onError)
}

function connectionUpdate(update: Partial<ConnectionState>, onClose: (error?: Error) => void, onQr?: (qr: string) => void, onReady?: () => void): void {
  if (update.qr) onQr?.(update.qr)
  else if (update.connection === 'open') onReady?.()
  else if (update.connection !== 'close') { /* do nothing, wait for next update */ }
  else onClose(update.lastDisconnect?.error)
}

function isInvalidAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (!('output' in error)) return false
  if (typeof error.output !== 'object' || error.output === null) return false
  if (!('statusCode' in error.output)) return false
  if (error.output.statusCode !== 401) return false
  return true
}

function isRequiredReconnectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (!('output' in error)) return false
  if (typeof error.output !== 'object' || error.output === null) return false
  if (!('statusCode' in error.output)) return false
  if (error.output.statusCode !== 515) return false
  return true
}

function connectionUpdateAfterLogin(update: Partial<ConnectionState>, onClose: (error?: Error) => void, onErr: (error: Error) => void): void {
  if (update.qr) onErr(new Error('Received QR code update during WhatsApp sync after login'))
  else if (update.connection === 'open') { /* do nothing, wait for next update */ }
  else if (update.connection !== 'close') { /* do nothing, wait for next update */ }
  else onClose(update.lastDisconnect?.error)
}
