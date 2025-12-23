import { logger } from '@/logger'
import { callback } from '../auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const redirect = await callback(request)
    return Response.redirect(redirect)
  }
  catch (error) {
    logger.error('Error during login callback', error)
    if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
    return Response.redirect(process.env.APP_URL + '/common/auth/error')
  }
}
