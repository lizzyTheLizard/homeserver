import { logger } from '@/app/shared/logger'
import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/app/shared/config'
import { handleMicrosoftLoginCallback } from '../../_external/microsoft'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getActualUrl } from '@/app/shared/_helper/UrlHelper'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserSession('startpage')
  try {
    const url = getActualUrl(request)
    await handleMicrosoftLoginCallback(user, url)
    return NextResponse.redirect(config.APP_URL + '/startpage/microsoft')
  }
  catch (error) {
    logger.warn('Error during Microsoft consent callback', error)
    return NextResponse.redirect(config.APP_URL + '/startpage/microsoft?error=microsoft_callback_failed')
  }
}
