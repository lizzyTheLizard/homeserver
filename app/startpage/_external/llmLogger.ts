import { logger } from '@/app/shared/logger'

export function createLoggingFetch(fetch: typeof global.fetch): typeof global.fetch {
  return async (resource, init) => {
    const requestStartTime = Date.now()
    const resourceUrl = resource instanceof Request ? resource.url : resource.toString()
    const bodyString = init?.body ? String(init.body) : '' // eslint-disable-line @typescript-eslint/no-base-to-string
    const requestSize = bodyString.length
    logger.debug(`Sending llm request of size ${requestSize.toString()} bytes to ${resourceUrl}`)
    // console.log(JSON.stringify(JSON.parse(bodyString), null, 2))

    const response = await fetch(resource, init)
    response.clone().text().then((text) => {
      const timeInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
      const reponseSize = text.length
      const parsedResponse = JSON.parse(text) as { choices: { finish_reason: string }[] }
      const results = parsedResponse.choices.map(c => c.finish_reason).join(', ')
      logger.debug(`LLM API response (${timeInS}s) of size ${reponseSize.toString()} bytes. Finish reasons: ${results}`)
      // console.log(JSON.stringify(parsedResponse, null, 2))
    }).catch((e: unknown) => logger.error(`Failed to read response text: ${e instanceof Error ? e.message : String(e)}`))
    return response
  }
}
