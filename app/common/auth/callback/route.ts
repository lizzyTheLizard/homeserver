import { logger } from '@/app/shared/logger'
import { callback } from '../auth'
import { NextRequest } from 'next/server'
import { config } from '@/app/shared/config'

export async function GET(request: NextRequest) {
  try {
    const redirect = await callback(request)
    return Response.redirect(redirect)
  }
  catch (error) {
    logger.error('Error during login callback', error)
    return Response.redirect(config.APP_URL + '/common/auth/error')
  }
}
