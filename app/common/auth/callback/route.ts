import { logger } from '@/logger'
import { callback } from '../auth'
import { NextRequest } from 'next/server'
import { config } from '@/app/config'

export async function GET(request: NextRequest) {
  try {
    const redirect = await callback(request)
    return Response.redirect(redirect)
  }
  catch (error) {
    logger.error('Error during login callback', error)
    return Response.redirect(config.appUrl.value + '/common/auth/error')
  }
}
