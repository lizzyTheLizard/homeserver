import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserSession, startLogin } from './app/common/auth/auth'
import { logger } from '@/app/shared/logger'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await getUserSession()
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
  else if (request.headers.get('User-Agent')?.includes('(Windows NT 6.1; WOW64)')) {
    logger.info(`Unauthenticated access from Win7 client (probably f6.ru) with IP ${request.headers.get('X-Forwarded-For') ?? 'unknown'}`)
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
