import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserSession, startLogin } from './app/common/auth/auth'
import { logger } from '@/app/shared/logger'
import { Crawler } from 'es6-crawler-detect/dist/lib/crawler'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await getUserSession()
  const crawlerDetector = new Crawler(request)

  let response: NextResponse
  if (request.nextUrl.pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }
  if (session)
    response = NextResponse.next()
  else if (request.nextUrl.pathname.startsWith('/common/auth/'))
    response = NextResponse.next()
  else if (request.headers.get('X-Requested-With') === 'XMLHttpRequest')
    response = new NextResponse('Unauthorized', { status: 401 })
  else if (crawlerDetector.isCrawler()) {
    const crawler = crawlerDetector.getMatches()
    const crawlerName = typeof crawler === 'string' ? crawler : 'unknown'
    logger.info(`Blocked crawler '${crawlerName}' access to ${request.nextUrl.pathname}`)
    response = new NextResponse('Forbidden', { status: 403 })
  }
  else if (request.headers.get('User-Agent')?.includes('(Windows NT 6.1; WOW64)')) {
    logger.info(`Unauthenticated access from Win7 client`)
    logger.info(`Request details:`)
    logger.info(`IP: ${request.url}`)
    logger.info(`Path: ${request.nextUrl.pathname}`)
    logger.info(`Method: ${request.method}`)
    logger.info(`Headers:`)
    request.headers.forEach((value, key) => {
      logger.info(`Header: ${key} = ${value}`)
    })
    response = new NextResponse('Forbidden', { status: 403 })
  }
  else {
    const redirectTo = await startLogin(request)
    response = NextResponse.redirect(redirectTo.href)
  }
  logger.debug(`${request.method} ${request.nextUrl.pathname} for ${session?.email ?? 'unauthenticated user'}`)
  return response
}

export const config = {
  matcher: '/(.*)',
}
