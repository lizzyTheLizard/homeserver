import { logger } from '@/logger'
import { logout } from '../auth'
import { redirect } from 'next/navigation'
import { config } from '@/app/config'

export async function GET() {
  try {
    await logout()
  }
  catch (error) {
    logger.error('Error during logout', error)
    return redirect(config.APP_URL + '/common/auth/error')
  }
  return redirect(config.APP_URL + '/common/auth/out')
}
