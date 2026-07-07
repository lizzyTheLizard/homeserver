import { logger } from '@/app/shared/logger'

export function createLoggingFetch(fetch: typeof global.fetch): typeof global.fetch {
  return async (resource, init) => {
    const requestStartTime = Date.now()
    logRequest(init)
    const response = await fetch(resource, init)
    void log(response, requestStartTime)
    return response
  }
}

async function log(res: Response, requestStartTime: number) {
  if (!res.ok) {
    logger.warn(`LLM API request failed with status ${res.status.toString()} ${res.statusText}`)
    return
  }
  const reader = res.clone().body?.getReader()
  if (!reader) {
    logger.warn('LLM API response has no readable stream body')
    return
  }
  const decoder = new TextDecoder()
  let responseSize = 0
  let first = true
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    const chunkText = decoder.decode(chunk.value, { stream: true })
    // In case of non-streaming, no chunk is the first chunk
    if (!chunkText.startsWith('data:')) first = false
    logResponseChunk(chunkText, first, requestStartTime)
    first = false
    responseSize += chunkText.length
  }
  logResponse(responseSize, requestStartTime)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logRequest(init: RequestInit | undefined) {
  // uncomment for full log
  /*
  const bodyString = init?.body ? String(init.body) : ''// eslint-disable-line @typescript-eslint/no-base-to-string
  const requestSize = bodyString.length
  logger.debug(`LLM request of size ${requestSize.toString()} bytes started`)
  console.log(bodyString)
  */
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logResponseChunk(chunkText: string, first: boolean, requestStartTime: number) {
  // uncomment for full log
  /*
  if (first) {
    const timeToFirstTokenInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
    logger.debug(`LLM first response of size ${chunkText.length.toString()} bytes received in ${timeToFirstTokenInS}s`)
  }
  console.log(chunkText)
  */
}

function logResponse(responseSize: number, requestStartTime: number) {
  const timeInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
  logger.debug(`LLM response of size ${responseSize.toString()} bytes completed in ${timeInS}s`)
}
