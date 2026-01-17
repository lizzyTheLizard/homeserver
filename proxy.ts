import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserSession, startLogin } from './app/common/auth/auth'
import { logger } from '@/app/shared/logger'

let lastNormalRequestTime: Date | undefined = undefined
const MAX_IDLE_TIME_MS = 1 * 60 * 1000 // 1 minute

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await getUserSession()
  const isF6Request = request.headers.get('User-Agent')?.includes('(Windows NT 6.1; WOW64)')
  if (!isF6Request) lastNormalRequestTime = new Date()
  let response: NextResponse
  if (request.nextUrl.pathname.startsWith('/_next/'))
    return NextResponse.next()
  if (session)
    response = NextResponse.next()
  else if (request.nextUrl.pathname.startsWith('/common/auth/'))
    response = NextResponse.next()
  else if (request.headers.get('X-Requested-With') === 'XMLHttpRequest')
    response = new NextResponse('Unauthorized', { status: 401 })
  else if (isF6Request) {
    const timeSinceLastNormalRequest = lastNormalRequestTime ? (new Date().getTime() - lastNormalRequestTime.getTime()) : undefined
    logger.info(`Unauthenticated access from Win7 client (probably f6.ru) with IP ${request.headers.get('X-Forwarded-For') ?? 'unknown'}`)
    if (timeSinceLastNormalRequest === undefined) {
      logger.warn('No normal requests have been recorded yet, shutting down to avoid further uptime.')
      return process.exit(0)
    }
    else if (timeSinceLastNormalRequest > MAX_IDLE_TIME_MS) {
      logger.warn(`All requests in the last ${MAX_IDLE_TIME_MS.toString()} ms are from Win7 clients (probably f6.ru). Exiting the process to avoid further uptime.`)
      return process.exit(0)
    }
    else {
      logger.debug(`Last normal request was at ${timeSinceLastNormalRequest.toString()} ms ago, allowing this request.`)
      response = new NextResponse('Unauthorized', { status: 401 })
    }
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
