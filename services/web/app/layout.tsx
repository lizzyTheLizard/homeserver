import { Header } from './shared/_components/Header'
import { PwaManager } from './shared/_components/PwaManager'
import { SidebarContainer } from './shared/_components/sidebar/SidebarContainer'
import { getUserSession } from './shared/auth/auth'

export const metadata = {
  title: 'Gutschi.site',
}

export const viewport = {
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  width: 'device-width',
}

export default async function RootLayout({ children }: React.PropsWithChildren) {
  const user = await getUserSession()
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <link rel="stylesheet" href="/global.css" />
        <PwaManager />
        <Header accessibleApplications={user?.applications ?? []} hasSession={Boolean(user)} />
        <SidebarContainer>
          {children}
        </SidebarContainer>
      </body>
    </html>
  )
}
