import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { getUserSession, startLogin } from './app/common/auth/auth'
import { logger } from '@/logger'

export async function proxy(request: NextRequest, event: NextFetchEvent): Promise<NextResponse> {
  const session = await getUserSession()
  let response: NextResponse
  if (session)
    response = NextResponse.next()
  else if (request.nextUrl.pathname === '/common/auth/callback')
    response = NextResponse.next()
  else if (request.headers.get('X-Requested-With') === 'XMLHttpRequest')
    response = new NextResponse('Unauthorized', { status: 401 })
  else {
    const redirectTo = await startLogin(request)
    response = NextResponse.redirect(redirectTo.href)
  }
  if (request.nextUrl.pathname.startsWith('/_next/')) {
    return response
  }
  logger.info(`${request.method} ${request.nextUrl.pathname} ${response.status.toString()} for ${session?.email ?? 'unauthenticated user'}`)
  return response
}
