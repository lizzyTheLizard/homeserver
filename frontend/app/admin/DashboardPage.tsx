import type { Application } from '../Application'

export default function DashboardPage() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </header>
      </div>
    </main>
  )
}

export const handle: { application: Application } = {
  application: {
    name: 'Cash',
    links: [
      { href: '/admin/', text: 'Dashboard' },
      { href: '/admin/cash/', text: 'Cash' },
    ],
  },
}
