import { useContext } from 'react'
import type { Application } from '../general/Application.ts'
import { AuthContext, ensureApplicationAccess } from '../general/auth/AuthContext'

export default function DashboardPage() {
  const user = useContext(AuthContext)
  ensureApplicationAccess(user, 'admin')
  return (
    <main>
      <h1>Admin Dashboard</h1>
    </main>
  )
}

export const handle: { application: Application } = {
  application: {
    name: 'Admin',
    links: [
      { href: '/admin/', text: 'Dashboard' },
      { href: '/admin/cash/', text: 'Cash' },
    ],
  },
}
