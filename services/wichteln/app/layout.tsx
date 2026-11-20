import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wichteln',
  description: 'Wünsche sammeln und anonym verteilen',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#b3261e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="topbar">
          <span className="logo">🎁 Wichteln</span>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
