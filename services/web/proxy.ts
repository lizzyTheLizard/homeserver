import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { getSession, CookieStore } from '@/app/shared/auth/session'
import { startLogin } from '@/app/shared/auth/auth'
import { logger } from '@/app/shared/logger'

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
]

const PUBLIC_PATHS = ['/shared/auth/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const start = Date.now()

  if (isPublicDoNotLogPath(pathname)) {
    return NextResponse.next()
  }

  logger.debug(`${method} ${request.url}`)

  const { response, forwarded } = await handleAuth(request, pathname)
  const duration = (Date.now() - start).toString()
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
    return { response: NextResponse.next(), forwarded: true }
  }

  if (isAjaxRequest(request)) {
    return { response: new NextResponse('Unauthorized', { status: 401 }), forwarded: false }
  }

  const response = NextResponse.redirect(new URL('/', request.url), 302)
  const cookieStore = createCookieStore(request, response)
  const redirectTo = await startLogin(request, cookieStore)
  response.headers.set('Location', redirectTo.href)
  return { response, forwarded: false }
}

function createCookieStore(request: NextRequest, response?: NextResponse): CookieStore {
  return {
    get: (name: string) => request.cookies.get(name),
    set: (nameOrOptions: string | ResponseCookie, value?: string, options?: Partial<ResponseCookie>) => {
      if (!response) throw new Error('Cannot set cookie in proxy without response object')
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
