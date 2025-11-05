import { useContext } from 'react'
import type { Application } from '../Application.ts'
import { AuthContext } from '../general/auth/AuthContext'

export default function DashboardPage() {
  const user = useContext(AuthContext)
  user.ensureApplicationAccess('admin')
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
