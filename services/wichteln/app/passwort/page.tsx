import Link from 'next/link'
import { requireAccount } from '@/lib/session'
import { safeContinuePath } from '@/lib/continuePath'
import { logout } from '../actions'
import { ChangePasswordForm } from '../components'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ weiter?: string | string[] }> }) {
  const account = await requireAccount({ allowPendingChange: true })
  const { weiter } = await searchParams
  const target = safeContinuePath(typeof weiter === 'string' ? weiter : undefined)

  return (
    <div className="card login">
      <h1>Passwort ändern</h1>
      {account.mustChangePassword
        ? (
            <p className="muted">
              Dein Passwort wurde vom Admin zurückgesetzt. Bitte wähle jetzt ein eigenes Passwort, bevor es weitergeht.
            </p>
          )
        : (
            <p className="muted">
              Wähle ein neues Passwort für dein Konto
              {' '}
              <strong>{account.name}</strong>
              . Es gilt für alle deine Gruppen.
            </p>
          )}
      <ChangePasswordForm continueTo={target} />
      {account.mustChangePassword
        ? (
            <form action={logout}>
              <button className="link">Abmelden</button>
            </form>
          )
        : (
            <p>
              <Link href={target} className="small">
                ← Zurück
              </Link>
            </p>
          )}
    </div>
  )
}
