import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  description: 'Wünsche sammeln und anonym verteilen',
  title: 'Wichteln',
}

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: '#b3261e',
  width: 'device-width',
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
