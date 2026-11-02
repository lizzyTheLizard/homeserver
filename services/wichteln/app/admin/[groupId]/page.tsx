import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/session'
import { getGroup } from '@/lib/store'
import { getDb } from '@/lib/db'
import { CopyInviteLink, ResetPasswordForm, SubmitButton } from '../../components'
import { deleteGroup, removeParticipant, resetPassword, startSelection } from '../actions'

export const dynamic = 'force-dynamic'

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  await requireAdmin()
  const { groupId } = await params
  const group = await getGroup(await getDb(), groupId)
  if (!group) notFound()

  const inWishes = group.phase === 'wishes'
  const done = group.users.filter(u => (inWishes ? u.wish : u.selectedWishOf)).length
  const total = group.users.length
  const canStart = inWishes && total >= 2 && done === total

  return (
    <>
      <Link href="/admin" className="small">
        ← Alle Gruppen
      </Link>
      <div className="row">
        <h1>{group.name}</h1>
        <span className="badge">{inWishes ? 'Phase 1 · Wünsche' : 'Phase 2 · Auswahl'}</span>
      </div>

      <section className="card">
        <h2>Einladungslink</h2>
        <p className="muted">
          {inWishes
            ? 'Schicke diesen Link allen Teilnehmenden. Darüber registrieren sie sich für die Gruppe und melden sich später wieder an.'
            : 'Die Registrierung ist geschlossen. Über den Link können sich bestehende Teilnehmende weiterhin anmelden.'}
        </p>
        <CopyInviteLink path={`/g/${group.inviteToken}`} />
      </section>

      <section className="card">
        <div className="row">
          <h2>{inWishes ? 'Wünsche eingetragen' : 'Wunsch gewählt'}</h2>
          <span className="muted">
            {done}
            {' '}
            /
            {total}
          </span>
        </div>
        <div className="progress">
          <div style={{ width: `${String(total ? (done / total) * 100 : 0)}%` }} />
        </div>

        <ul className="list">
          {group.users.map((u) => {
            const ok = inWishes ? !!u.wish : !!u.selectedWishOf
            return (
              <li key={u.id}>
                <div className="participant">
                  <strong>{u.name}</strong>
                  <ResetPasswordForm name={u.name} action={resetPassword.bind(null, group.id, u.id)} />
                </div>
                <div className="participant-status">
                  <span className={`badge ${ok ? 'done' : 'open'}`}>
                    {inWishes ? (ok ? 'Wunsch eingetragen' : 'Kein Wunsch') : ok ? 'Gewählt' : 'Noch nicht gewählt'}
                  </span>
                  {inWishes && (
                    <form action={removeParticipant.bind(null, group.id, u.id)}>
                      <SubmitButton className="link" confirm={`${u.name} wirklich entfernen?`}>
                        Entfernen
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {total === 0 && <p className="muted">Noch niemand hat sich registriert.</p>}

        <div className="row" style={{ marginTop: 12 }}>
          <Link href={`/admin/${group.id}`} className="small">
            Aktualisieren
          </Link>
        </div>
      </section>

      {inWishes
        ? (
            <>
              <section className="card">
                <h2>Phase 2 starten</h2>
                <p className="muted">
                  Sobald alle Teilnehmenden ihren Wunsch eingetragen haben, kannst du die Auswahlphase starten. Danach können
                  Wünsche nicht mehr geändert werden.
                </p>
                <form action={startSelection.bind(null, group.id)}>
                  <SubmitButton
                    className="full"
                    disabled={!canStart}
                    confirm="Auswahlphase jetzt starten? Wünsche können danach nicht mehr geändert werden."
                  >
                    Auswahlphase starten
                  </SubmitButton>
                </form>
                {!canStart && (
                  <p className="muted small">
                    {total < 2 ? 'Es braucht mindestens zwei Teilnehmende.' : `Es fehlen noch ${String(total - done)} Wünsche.`}
                  </p>
                )}
              </section>
            </>
          )
        : (
            done === total && (
              <section className="card">
                <div className="alert ok">Alle haben einen Wunsch gewählt. Das Wichteln ist komplett verteilt! 🎉</div>
              </section>
            )
          )}

      <section className="card">
        <h2>Gruppe löschen</h2>
        <form action={deleteGroup.bind(null, group.id)}>
          <SubmitButton
            className="secondary"
            confirm={`Gruppe „${group.name}“ mit allen Daten endgültig löschen?`}
          >
            Gruppe löschen
          </SubmitButton>
        </form>
      </section>
    </>
  )
}
