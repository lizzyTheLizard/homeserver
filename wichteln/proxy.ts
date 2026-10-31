import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'

/**
 * Fails closed before any page or action runs: without the complete
 * configuration the app answers 503 instead of rendering with defaults.
 * `/api/health` is excluded so it can report the specific failure.
 */
export function proxy() {
  try {
    getConfig()
    return NextResponse.next()
  }
  catch {
    return new NextResponse('Service unavailable', { status: 503 })
  }
}

export const config = {
  matcher: ['/((?!api/health).*)'],
}
