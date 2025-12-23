import { logger } from '@/logger'
import { logout } from '../auth'
import { redirect } from 'next/navigation'

export async function GET() {
  try {
    await logout()
  }
  catch (error) {
    if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
    logger.error('Error during logout', error)
    return redirect(process.env.APP_URL + '/common/auth/error')
  }
  if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
  return redirect(process.env.APP_URL + '/common/auth/out')
}
