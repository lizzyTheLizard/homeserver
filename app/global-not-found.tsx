import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from './common/components/Header'
import { getUserSession } from './common/auth/auth'
import { ErrorPage } from './shared/components/ErrorPage'

export const metadata: Metadata = {
  title: 'Gutschi.site - Not Found',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
}

export default async function NotFound() {
  const user = await getUserSession()
  return (
    <html lang="en">
      <body>
        <Header accessibleApplications={user?.applications ?? []} hasSession={!!user}></Header>
        <ErrorPage name="404 Not Found" message="The requested page could not be found." />
      </body>
    </html>
  )
}
