import type { NextRequest } from 'next/server'
import { callback } from '../auth'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'

export async function GET(request: NextRequest) {
  try {
    const redirect = await callback(request)
    return Response.redirect(redirect)
  }
  catch (error) {
    logger.warn('Error during login callback', error)
    return Response.redirect(`${config.APP_URL  }/shared/auth/error`)
  }
}
