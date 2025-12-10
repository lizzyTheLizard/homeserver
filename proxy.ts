import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserSession, startLogin } from './app/common/auth/lib'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await getUserSession()
  if (session)
    return NextResponse.next()
  if (request.nextUrl.pathname === '/common/auth/callback')
    return NextResponse.next()
  if (request.headers.get('X-Requested-With') === 'XMLHttpRequest')
    return new NextResponse('Unauthorized', { status: 401 })
  const redirectTo = await startLogin(request)
  return NextResponse.redirect(redirectTo.href)
}
