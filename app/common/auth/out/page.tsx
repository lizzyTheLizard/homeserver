import { Metadata } from 'openai/resources/index.js'
import { getUserSession } from '../auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Gutschi.site - Logged Out',
}

export default async function Page() {
  const user = await getUserSession()
  if (user) {
    if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
    redirect(process.env.APP_URL + '/common/auth/logout')
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
