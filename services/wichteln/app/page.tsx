import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getAccount, listAccountGroups, listOwnedGroups } from '@/lib/store'
import type { Account } from '@/lib/store'
import { getDb } from '@/lib/db'
import { changePasswordPath } from '@/lib/continuePath'
import { logout } from './actions'
import { CreateGroupForm, LoginForm } from './components'
import { createOwnedGroup } from './verwaltung/actions'

export const dynamic = 'force-dynamic'

export default async function StartPage() {
  const s = await getSession()
  if (s?.role === 'admin') redirect('/admin')
  const account = s?.role === 'user' ? await getAccount(await getDb(), s.accountId) : null
  if (account) return <GroupOverview account={account} />

  return (
    <div className="card login">
      <h1>Willkommen beim Wichteln</h1>
      <p className="muted">Melde dich mit deinem Namen und Passwort an. Neu hier? Registriere dich über den Einladungslink deiner Gruppe.</p>
      <LoginForm />
    </div>
  )
}

async function GroupOverview({ account }: { account: Account }) {
  if (account.mustChangePassword) redirect(changePasswordPath('/'))
  const db = await getDb()
  const groups = await listAccountGroups(db, account.id)
  const owned = await listOwnedGroups(db, account.id)

  return (
    <>
      <div className="row">
        <h1>Hallo {account.name}!</h1>
        <div className="actions">
          <Link href="/passwort" className="button secondary">
            Passwort ändern
          </Link>
          <form action={logout}>
            <button className="secondary">Abmelden</button>
          </form>
        </div>
      </div>

      <section className="card">
        <h2>Deine Gruppen</h2>
        {groups.length === 0 ? (
          <p className="muted">
            Du nimmst noch an keiner Gruppe teil. Öffne den Einladungslink, den du erhalten hast, um einer Gruppe beizutreten, oder erstelle unten eine eigene
            Gruppe.
          </p>
        ) : (
          <ul className="list">
            {groups.map(g => (
              <li key={g.id}>
                <Link href={`/gruppen/${g.id}`}>
                  <strong>{g.name}</strong>
                </Link>
                <Link href={`/gruppen/${g.id}`} className="button secondary">
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {owned.length > 0 && (
        <section className="card">
          <h2>Von dir verwaltete Gruppen</h2>
          <ul className="list">
            {owned.map(g => (
              <li key={g.id}>
                <Link href={`/verwaltung/${g.id}`}>
                  <strong>{g.name}</strong>
                </Link>
                <Link href={`/verwaltung/${g.id}`} className="button secondary">
                  Verwalten
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Neue Gruppe erstellen</h2>
        <p className="muted">
          Hier erstellst du deine eigene Wichtel-Gruppe, zum Beispiel für dein Team oder deine Familie. Du verwaltest sie selbst: Du lädst die Teilnehmenden
          über einen Einladungslink ein und startest die Auswahlphase, sobald alle ihren Wunsch eingetragen haben. Ob du selbst mitwichtelst, entscheidest du
          später auf der Verwaltungsseite.
        </p>
        <CreateGroupForm action={createOwnedGroup} />
      </section>
    </>
  )
}
