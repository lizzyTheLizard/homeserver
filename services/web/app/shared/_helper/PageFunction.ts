import { ReactNode } from 'react'
import { isBackendError } from './BackendError'
import { logger } from '../logger'
import { Temporal } from '@js-temporal/polyfill'
import { nontransactional } from '../_external/db/access'
import { logEvent } from '../_data/Event'

export async function serverPageFunction(name: string, fn: () => Promise<ReactNode> | ReactNode): Promise<ReactNode> {
  const start = Temporal.Now.instant().epochMilliseconds
  logger.debug(`Rendering page '${name}'`)
  return Promise.resolve(fn()).then((result) => {
    const time = Temporal.Now.instant().epochMilliseconds - start
    logger.debug(`Rendered page '${name}' in ${time.toString()} ms successfully`)
    return result
  }).catch(async (error: unknown) => {
    const time = Temporal.Now.instant().epochMilliseconds - start
    if (isDynamicServerUsage(error)) throw error
    if (isBackendError(error)) {
      if (error.showStack) logger.warn(`Error while rendering page '${name}' in ${time.toString()} ms:`, error)
      else logger.warn(`Error while rendering page '${name}' in ${time.toString()} ms: ${error.userMessage}`)
      throw error
    }
    const code = httpAccessResponseCode(error)
    if (code === undefined) {
      logger.error(`Unknown error while rendering page '${name}' in ${time.toString()} ms:`, error)
      await nontransactional(c => logEvent(c, 'ERROR', `Unknown error while rendering page '${name}': ${String(error)}`))
    }
    else {
      logger.warn(`HTTP ${code.toString()} error while rendering page '${name}' in ${time.toString()} ms:`, error)
      await nontransactional(c => logEvent(c, 'WARN', `HTTP ${code.toString()} error while rendering page '${name}' in ${time.toString()} ms: ${String(error)}`))
    }
    throw error
  })
}

function isDynamicServerUsage(error: unknown): boolean {
  return error instanceof Error && 'digest' in error && error.digest === 'DYNAMIC_SERVER_USAGE'
}

function httpAccessResponseCode(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined
  if (!('digest' in error) || typeof error.digest !== 'string') return undefined
  if (!error.digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;')) return undefined
  const codeStr = error.digest.substring('NEXT_HTTP_ERROR_FALLBACK;'.length)
  const code = parseInt(codeStr, 10)
  if (isNaN(code)) return undefined
  return code
}
