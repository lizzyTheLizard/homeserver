import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserSession, startLogin } from './app/common/auth/auth'
import { logger } from '@/app/shared/logger'
import { triggerWhatsappSync } from './app/startpage/_external/whatsapp/syncManager'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await getUserSession()
  let response: NextResponse
  if (request.nextUrl.pathname.startsWith('/_next/'))
    return NextResponse.next()
  if (session) {
    await triggerWhatsappSync(session)
    response = NextResponse.next()
  }
  else if (request.nextUrl.pathname.startsWith('/common/auth/'))
    response = NextResponse.next()
  else if (request.headers.get('X-Requested-With') === 'XMLHttpRequest')
    response = new NextResponse('Unauthorized', { status: 401 })
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
