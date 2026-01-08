import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from './common/_components/Header'
import { getUserSession } from './common/auth/auth'

export const metadata: Metadata = {
  title: 'Gutschi.site',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
}

export default async function RootLayout({ children }: React.PropsWithChildren) {
  const user = await getUserSession()
  return (
    <html lang="en">
      <body>
        <Header accessibleApplications={user?.applications ?? []} hasSession={!!user}></Header>
        {children}
      </body>
    </html>
  )
}
