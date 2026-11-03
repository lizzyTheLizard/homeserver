import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getAccount, listAccountGroups } from '@/lib/store'
import type { Account } from '@/lib/store'
import { getDb } from '@/lib/db'
import { changePasswordPath } from '@/lib/continuePath'
import { logout } from './actions'
import { LoginForm } from './components'

export const dynamic = 'force-dynamic'

export default async function StartPage() {
  const s = await getSession()
  if (s?.role === 'admin') redirect('/admin')
  const account = s?.role === 'user' ? await getAccount(await getDb(), s.accountId) : null
  if (account) return <GroupOverview account={account} />

  return (
    <div className="card login">
      <h1>Willkommen beim Wichteln</h1>
      <p className="muted">
        Melde dich mit deinem Namen und Passwort an. Neu hier? Registriere dich über den Einladungslink deiner Gruppe.
      </p>
      <LoginForm />
    </div>
  )
}

async function GroupOverview({ account }: { account: Account }) {
  if (account.mustChangePassword) redirect(changePasswordPath('/'))
  const groups = await listAccountGroups(await getDb(), account.id)
  const only = groups.length === 1 ? groups[0] : undefined
  if (only) redirect(`/gruppen/${only.id}`)

  return (
    <>
      <div className="row">
        <h1>
          Hallo
          {' '}
          {account.name}
          !
        </h1>
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
        {groups.length === 0
          ? (
              <p className="muted">
                Du bist noch in keiner Gruppe. Öffne den Einladungslink, den du erhalten hast, um einer Gruppe beizutreten.
              </p>
            )
          : (
              <ul className="list">
                {groups.map(g => (
                  <li key={g.id}>
                    <Link href={`/gruppen/${g.id}`}>
                      <strong>{g.name}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
      </section>
    </>
  )
}
