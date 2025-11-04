import type { Application } from '../Application'

export default function DashboardPage() {
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
