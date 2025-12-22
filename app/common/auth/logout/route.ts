import { logger } from '@/logger'
import { logout } from '../auth'
import { config } from '@/app/config'
import { redirect } from 'next/navigation'

export async function GET() {
  try {
    await logout()
  }
  catch (error) {
    logger.error('Error during logout', error)
    return redirect(config.appUrl.value + '/common/auth/error')
  }
  return redirect(config.appUrl.value + '/common/auth/out')
}
