import type { Application } from '../Application.ts'

export default function ProjectPage() {
  console.log('Rendering ProjectPage')
  return (
    <main>
      <h1>Cash Project Page</h1>
    </main>
  )
}

export const handle: { application: Application } = {
  application: {
    name: 'Cash',
    links: [
      { href: '/cash/journal', text: 'Journal' },
      { href: '/cash/konten', text: 'Konten' },
      { href: '/cash/report', text: 'Report' },
      { href: '/cash/monat', text: 'Monatsabschluss' },
    ],
  },
}
