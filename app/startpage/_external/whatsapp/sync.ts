import makeWASocket, { UserFacingSocketConfig, WABrowserDescription, ConnectionState, proto, BaileysEventMap } from '@whiskeysockets/baileys'
import { logger } from '@/app/shared/logger'
import { ILogger } from '@whiskeysockets/baileys/lib/Utils/logger'
import { createExportableAuth } from './auth'
import { createStore } from './store'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { findAuthStateByOwner, updateAuthState } from '../../_data/Chat'

export interface Callbacks {
  qrCallback: (qr: string) => void
  authCallback: () => void
  readyCallback: () => void
}

export interface SyncHandler {
  close: () => Promise<void>
  finished: Promise<void>
}

export async function startSync(owner: string, callbacks: Callbacks, afterLogin?: boolean): Promise<SyncHandler> {
  const authState = await nontransactional(async c => findAuthStateByOwner(c, owner))
  const auth = createExportableAuth(authState)
  const browser = ['Gutschi.site', 'Desktop', '1.0.0'] as WABrowserDescription
  const config: UserFacingSocketConfig = { auth, browser, logger: getLogger(), markOnlineOnConnect: false }
  const sock = makeWASocket(config)
  const store = createStore(owner, sock.ev)

  const finished = new Promise<void>((resolve, reject) => {
    function connectionUpdate(update: Partial<ConnectionState>): void {
      if (update.qr) {
        showQr(update.qr)
        return
      }
      if (update.connection === 'open') {
        logger.debug('Connection to WhatsApp established')
        if (!afterLogin) callbacks.readyCallback()
        return
      }
      if (update.connection !== 'close') {
        /* do nothing, wait for next update */
        return
      }
      if (!update.lastDisconnect?.error) {
        handleClose()
        return
      }
      if (!('output' in update.lastDisconnect.error)) failed(update.lastDisconnect.error)
      else if (update.lastDisconnect.error.output.statusCode !== 515) failed(update.lastDisconnect.error)
      else authSuccess()
    }

    function disconnect() {
      sock.ev.off('connection.update', connectionUpdate)
      sock.ev.off('messaging-history.set', historyUpdate)
    }

    function handleClose() {
      disconnect()
      resolve()
    }

    function failed(error: Error) {
      disconnect()
      logger.warn('Failed to sync WhatsApp history', error)
      sock.end(error).catch((err: unknown) => { logger.warn('Failed to close WhatsApp connection after failure', err) })
      reject(error)
    }

    function historyUpdate(update: BaileysEventMap['messaging-history.set']): void {
      if (update.syncType === proto.HistorySync.HistorySyncType.RECENT && afterLogin) {
        // There are more messages afterwards, so just wait a bit to get themn as well
        setTimeout(() => { callbacks.readyCallback() }, 1000)
      }
    }

    function showQr(qr: string): void {
      logger.debug('Received QR code for authentication')
      if (afterLogin) failed(new Error('Received QR code update during WhatsApp sync after login'))
      try {
        callbacks.qrCallback(qr)
      }
      catch (error: unknown) {
        failed(error instanceof Error ? error : new Error(String(error)))
      }
    }

    function authSuccess(): void {
      logger.debug('Authentication successful, re-syncing...')
      callbacks.authCallback()
      disconnect()
      store.reset()
        .then(() => startSync(owner, callbacks, true))
        .then(async (newHandler) => {
          handler.close = () => newHandler.close()
          await newHandler.finished
        }).then(() => { resolve() })
        .catch((error: unknown) => {
          failed(error instanceof Error ? error : new Error(String(error)))
        })
    }

    function credentialUpdate() {
      transactional(async (client) => {
        await updateAuthState(client, owner, auth.toAuthState())
      }).catch((error: unknown) => {
        logger.warn('Failed to update WhatsApp credentials in database', error instanceof Error ? error : new Error(String(error)))
      })
    }

    sock.ev.on('creds.update', credentialUpdate)
    sock.ev.on('connection.update', connectionUpdate)
    sock.ev.on('messaging-history.set', historyUpdate)
  })

  const handler = {
    close: async () => { await sock.end(undefined); await finished },
    finished,
  }

  return handler
}

function getLogger(): ILogger {
  return {
    level: logger.level,
    child: () => getLogger(),
    trace: () => { /* empty */ },
    debug: () => { /* empty */ },
    info: () => { /* empty */ },
    warn: () => { /* empty */ },
    error: () => { /* empty */ },
  }
}
