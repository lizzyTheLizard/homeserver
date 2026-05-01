import './globals.css'
import { Header } from './common/_components/Header'
import { getUserSession } from './common/auth/auth'
import { SidebarContainer } from './shared/_components/sidebar/SidebarContainer'

export const metadata = {
  title: 'Gutschi.site',
}

export const viewport = {
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
        <SidebarContainer>
          {children}
        </SidebarContainer>
      </body>
    </html>
  )
}
