import Link from 'next/link'
import { requireAdmin } from '@/lib/session'
import { listGroups } from '@/lib/store'
import { getDb } from '@/lib/db'
import { logout } from '../actions'
import { CreateGroupForm } from '../components'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  await requireAdmin()
  const groups = await listGroups(await getDb())

  return (
    <>
      <div className="row">
        <h1>Admin</h1>
        <form action={logout}>
          <button className="secondary">Abmelden</button>
        </form>
      </div>

      <section className="card">
        <h2>Gruppen</h2>
        {groups.length === 0
          ? (
              <p className="muted">Noch keine Gruppen vorhanden.</p>
            )
          : (
              <ul className="list">
                {groups.map((g) => {
                  const done
                    = g.phase === 'wishes'
                      ? g.users.filter(u => u.wish).length
                      : g.users.filter(u => u.selectedWishOf).length
                  return (
                    <li key={g.id}>
                      <div className="participant">
                        <Link href={`/admin/${g.id}`}>
                          <strong>{g.name}</strong>
                        </Link>
                        <span className="muted small">
                          {g.phase === 'wishes' ? 'Phase 1 · Wünsche' : 'Phase 2 · Auswahl'}
                          {' '}
                          ·
                          {done}
                          /
                          {g.users.length}
                          {' '}
                          {g.phase === 'wishes' ? 'Wünsche eingetragen' : 'gewählt'}
                        </span>
                      </div>
                      <Link href={`/admin/${g.id}`} className="button secondary">
                        Öffnen
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
      </section>

      <section className="card">
        <h2>Neue Gruppe erstellen</h2>
        <CreateGroupForm />
      </section>
    </>
  )
}
