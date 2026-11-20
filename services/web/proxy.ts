import { type CookieStore, getSession } from '@/app/shared/auth/session';
import { type NextRequest, NextResponse } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { logger } from '@/app/shared/logger'
import { startLogin } from '@/app/shared/auth/auth'

const PUBLIC_DO_NOT_LOG_PATHS = [
  '/_next/',
  '/__nextjs_source-map',
  '/__nextjs_original-stack-frames',
  '/.well-known/',
  '/global.css',
  '/favicon.ico',
  '/sw.js',
  '/manifest.webmanifest',
  '/manifest.json',
  '/robots.txt',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/shared/ping',
  '/pwa.html',
],

 PUBLIC_PATHS = ['/shared/auth/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl,
   {method} = request,
   start = Date.now()

  if (isPublicDoNotLogPath(pathname)) {
    return NextResponse.next()
  }

  logger.debug(`${method} ${request.url}`)

  const { response, forwarded } = await handleAuth(request, pathname),
   duration = (Date.now() - start).toString()
  if (forwarded) {
    logger.info(`${method} ${pathname} forwarded in (${duration}ms)`)
  }
  else {
    logger.info(`${method} ${pathname} answered with ${response.status.toString()} in (${duration}ms)`)
  }
  return response
}

async function handleAuth(request: NextRequest, pathname: string): Promise<{ response: NextResponse, forwarded: boolean }> {
  const session = await getSession(createCookieStore(request))

  if (session.userInfo || isPublicPath(pathname)) {
    return { forwarded: true, response: NextResponse.next() }
  }

  if (isAjaxRequest(request)) {
    return { forwarded: false, response: new NextResponse('Unauthorized', { status: 401 }) }
  }

  const response = NextResponse.redirect(new URL('/', request.url), 302),
   cookieStore = createCookieStore(request, response),
   redirectTo = await startLogin(request, cookieStore)
  response.headers.set('Location', redirectTo.href)
  return { forwarded: false, response }
}

function createCookieStore(request: NextRequest, response?: NextResponse): CookieStore {
  return {
    get: (name: string) => request.cookies.get(name),
    set: (nameOrOptions: string | ResponseCookie, value?: string, options?: Partial<ResponseCookie>) => {
      if (!response) {throw new Error('Cannot set cookie in proxy without response object')}
      if (typeof nameOrOptions === 'string') {
        response.cookies.set(nameOrOptions, value ?? '', options)
      }
      else {
        response.cookies.set(nameOrOptions)
      }
    },
  }
}

function isPublicDoNotLogPath(pathname: string): boolean {
  return PUBLIC_DO_NOT_LOG_PATHS.some(prefix => pathname.startsWith(prefix))
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(prefix => pathname.startsWith(prefix))
}

function isAjaxRequest(request: NextRequest): boolean {
  const requestedWith = request.headers.get('x-requested-with')
  return requestedWith?.toLowerCase() === 'xmlhttprequest'
}
