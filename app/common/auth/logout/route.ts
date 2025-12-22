import { logger } from '@/logger'
import { logout } from '../auth'
import { config } from '@/app/config'

export async function GET() {
  try {
    await logout()
    return Response.redirect(config.appUrl.value + '/common/auth/out')
  }
  catch (error) {
    logger.error(error)
    return Response.redirect(config.appUrl.value + '/common/auth/error')
  }
}
