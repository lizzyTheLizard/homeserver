import { getUserSession } from '../auth'
import { redirect } from 'next/navigation'
import { config } from '@/app/shared/config'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Gutschi.site - Logged Out',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const user = await getUserSession()
    if (user) {
      redirect(config.APP_URL + '/shared/auth/logout')
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
  })
}
