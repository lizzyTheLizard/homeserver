import Link from 'next/link'
import { requireAdmin } from '@/lib/session'
import { listAccounts } from '@/lib/store'
import { getDb } from '@/lib/db'
import { ResetPasswordForm } from '../../components'
import { resetPassword } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  await requireAdmin()
  const accounts = await listAccounts(await getDb())

  return (
    <>
      <Link href="/admin" className="small">
        ← Alle Gruppen
      </Link>
      <h1>Konten</h1>

      <section className="card">
        {accounts.length === 0
          ? (
              <p className="muted">Noch keine Konten vorhanden.</p>
            )
          : (
              <ul className="list">
                {accounts.map(account => (
                  <li key={account.id}>
                    <div className="participant">
                      <strong>{account.name}</strong>
                      <span className="muted small">
                        {account.groups.length > 0 ? account.groups.join(', ') : 'Keiner Gruppe zugeordnet'}
                      </span>
                      <ResetPasswordForm name={account.name} action={resetPassword.bind(null, account.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
        {accounts.length > 0 && (
          <p className="muted small">
            „Passwort zurücksetzen“ gilt für alle Gruppen der Person. Bei der nächsten Anmeldung muss sie ein eigenes
            Passwort wählen.
          </p>
        )}
      </section>
    </>
  )
}
