import { logger } from '@/app/shared/logger'
import { logout } from '../auth'
import { redirect } from 'next/navigation'
import { config } from '@/app/shared/config'

export async function GET() {
  try {
    await logout()
  }
  catch (error) {
    logger.warn('Error during logout', error)
    return redirect(config.APP_URL + '/common/auth/error')
  }
  return redirect(config.APP_URL + '/common/auth/out')
}
