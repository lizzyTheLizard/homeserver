import { config } from '../config'

export function getActualUrl(urlOrRequest: URL | Request): URL {
  // We need to replace host, port etc. as the request will have the local docker address
  const url = urlOrRequest instanceof URL ? urlOrRequest : new URL(urlOrRequest.url)
  const appUrl = new URL(config.APP_URL)
  url.protocol = appUrl.protocol
  url.hostname = appUrl.hostname
  url.port = appUrl.port
  return url
}
