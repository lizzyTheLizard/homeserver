import { logger } from '@/logger'
import { callback } from '../auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const redirect = await callback(request)
    return Response.redirect(redirect)
  }
  catch (error) {
    logger.error('Error during authentication callback', error)
    return new Response('Authentication failed', { status: 500 })
  }
}
