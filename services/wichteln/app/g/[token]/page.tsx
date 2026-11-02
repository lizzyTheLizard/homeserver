import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGroupByInviteToken } from '@/lib/store'
import { getDb } from '@/lib/db'
import { GroupLoginForm, RegisterForm } from '../../components'

export const dynamic = 'force-dynamic'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const group = await getGroupByInviteToken(await getDb(), token)
  if (!group) notFound()

  const s = await getSession()
  if (s?.role === 'user' && s.groupId === group.id && group.users.some(u => u.id === s.userId)) redirect('/wunsch')

  return (
    <div className="login stack">
      <div>
        <h1>{group.name}</h1>
        <p className="muted">Du wurdest zum Wichteln eingeladen. Melde dich an oder registriere dich für diese Gruppe.</p>
      </div>

      <section className="card">
        <h2>Anmelden</h2>
        <p className="muted small">Du hast dich für diese Gruppe schon registriert?</p>
        <GroupLoginForm token={group.inviteToken} />
      </section>

      <section className="card">
        <h2>Registrieren</h2>
        {group.phase === 'wishes'
          ? (
              <>
                <p className="muted small">Neu hier? Wähle einen Namen und ein Passwort. Beides gilt nur für diese Gruppe.</p>
                <RegisterForm token={group.inviteToken} />
              </>
            )
          : (
              <div className="alert error">
                Die Auswahlphase hat bereits begonnen. Eine Registrierung ist nicht mehr möglich.
              </div>
            )}
      </section>
    </div>
  )
}
