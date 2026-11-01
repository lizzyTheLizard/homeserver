import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { findUser } from '@/lib/store'
import { getDb } from '@/lib/db'
import { LoginForm } from './components'

export default async function LoginPage() {
  const s = await getSession()
  if (s?.role === 'admin') redirect('/admin')
  if (s?.role === 'user') {
    const found = await findUser(await getDb(), s.groupId, s.userId)
    if (found) redirect('/wunsch')
  }

  return (
    <div className="card login">
      <h1>Willkommen beim Wichteln</h1>
      <p className="muted">Melde dich mit den Zugangsdaten an, die du erhalten hast.</p>
      <LoginForm />
    </div>
  )
}
