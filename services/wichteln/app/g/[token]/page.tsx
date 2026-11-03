import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getAccount, getGroupByInviteToken, joinGroup } from '@/lib/store'
import type { Account, Group } from '@/lib/store'
import { getDb, withTransaction } from '@/lib/db'
import { changePasswordPath } from '@/lib/continuePath'
import { GroupLoginForm, RegisterForm } from '../../components'

export const dynamic = 'force-dynamic'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = await getDb()
  const group = await getGroupByInviteToken(db, token)
  if (!group) notFound()

  const s = await getSession()
  const account = s?.role === 'user' ? await getAccount(db, s.accountId) : null
  if (account) return <SignedInInvite group={group} account={account} />

  return (
    <div className="login stack">
      <div>
        <h1>{group.name}</h1>
        <p className="muted">Du wurdest zum Wichteln eingeladen. Melde dich an oder registriere dich für diese Gruppe.</p>
      </div>

      <section className="card">
        <h2>Anmelden</h2>
        <p className="muted small">Du hast schon ein Konto, auch aus einer anderen Gruppe? Melde dich damit an.</p>
        <GroupLoginForm token={group.inviteToken} />
      </section>

      <section className="card">
        <h2>Registrieren</h2>
        {group.phase === 'wishes'
          ? (
              <>
                <p className="muted small">
                  Neu hier? Wähle einen Namen und ein Passwort. Damit meldest du dich auch in allen weiteren Gruppen an.
                </p>
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

/** Joins the signed-in account during the wish phase (idempotent) and opens the group. */
async function SignedInInvite({ group, account }: { group: Group, account: Account }) {
  if (account.mustChangePassword) redirect(changePasswordPath(`/g/${group.inviteToken}`))

  const joined = await withTransaction(db => joinGroup(db, group.id, account.id))
  if (joined.ok) redirect(`/gruppen/${group.id}`)

  return (
    <div className="card login">
      <h1>{group.name}</h1>
      <div className="alert error">{joined.error}</div>
      <p>
        <Link href="/">Zu deinen Gruppen</Link>
      </p>
    </div>
  )
}
