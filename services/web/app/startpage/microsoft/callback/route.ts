import { logger } from '@/app/shared/logger'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { config } from '@/app/shared/config'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getActualUrl } from '@/app/shared/_helper/UrlHelper'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  await getAuthenticatedUserSession('startpage')
  try {
    const url = getActualUrl(request),
     cookieStore = await cookies(),
     response = await fetch(`${config.ASSISTANT_INTERNAL_URL}/microsoft/callback`, {
      body: JSON.stringify({ callbackUrl: url.href }),
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieStore.toString() },
      method: 'POST',
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
    }
    return NextResponse.redirect(`${config.APP_URL  }/startpage/microsoft`)
  }
  catch (error) {
    logger.warn('Error during Microsoft consent callback', error)
    return NextResponse.redirect(`${config.APP_URL  }/startpage/microsoft?error=microsoft_callback_failed`)
  }
}
