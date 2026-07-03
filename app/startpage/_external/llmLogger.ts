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
  let lastChunkText = ''
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    let chunkText = decoder.decode(chunk.value, { stream: true })
    // In case of streaming responses the chunks are prefixed with "data:", remove this
    if (chunkText.startsWith('data:')) chunkText = chunkText.substring(5).trim()
    // In case of non-streaming, no chunk is the first chunk
    else first = false
    // The last chunk is just "[DONE]", ignore this
    if (chunkText.startsWith('[DONE]')) continue
    logResponseChunk(chunkText, first, requestStartTime)
    lastChunkText = chunkText
    first = false
    responseSize += chunkText.length
  }
  logResponse(lastChunkText, responseSize, requestStartTime)
}

function logRequest(init: RequestInit | undefined) {
  const bodyString = init?.body ? String(init.body) : ''// eslint-disable-line @typescript-eslint/no-base-to-string
  const requestSize = bodyString.length
  logger.debug(`LLM request of size ${requestSize.toString()} bytes started`)
  // console.log(JSON.stringify(JSON.parse(bodyString), null, 2))
}

function logResponseChunk(chunkText: string, first: boolean, requestStartTime: number) {
  if (first) {
    const timeToFirstTokenInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
    logger.debug(`LLM first response of size ${chunkText.length.toString()} bytes received in ${timeToFirstTokenInS}s`)
  }
  // console.log(JSON.stringify(JSON.parse(chunkText), null, 2))
}

function logResponse(lastChunkText: string, responseSize: number, requestStartTime: number) {
  const timeInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
  const response = lastChunkText.startsWith('data: {') ? lastChunkText.substring(6) : lastChunkText
  const parsedResponse = JSON.parse(response) as { choices: { finish_reason: string }[] }
  const results = parsedResponse.choices.map(c => c.finish_reason).join(', ')
  logger.debug(`LLM response of size ${responseSize.toString()} bytes completed in ${timeInS}s. Finish reasons: ${results}`)
}
