import { logger } from '@/app/shared/logger'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { config } from '@/app/shared/config'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getActualUrl } from '@/app/shared/_helper/UrlHelper'
import { handleMicrosoftLoginCallback } from '../_external/graph'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserSession('startpage')
  try {
    await handleMicrosoftLoginCallback(user, getActualUrl(request))
    return NextResponse.redirect(`${config.APP_URL}/startpage/microsoft`)
  } catch (error) {
    logger.warn('Error during Microsoft consent callback', error)
    return NextResponse.redirect(`${config.APP_URL}/startpage/microsoft?error=microsoft_callback_failed`)
  }
}
