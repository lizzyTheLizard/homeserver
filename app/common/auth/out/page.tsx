import { Metadata } from 'openai/resources/index.js'
import { getUserSession } from '../auth'
import { redirect } from 'next/navigation'
import { config } from '@/app/config'

export const metadata: Metadata = {
  title: 'Gutschi.site - Logged Out',
}

export default async function Page() {
  const user = await getUserSession()
  if (user) {
    redirect(config.APP_URL + '/common/auth/logout')
  }
  else {
    return (
      <main>
        <h1>Logged Out</h1>
        <p>You have successfully logged out of the application.</p>
        <a href="/">Login</a>
      </main>
    )
  }
}
