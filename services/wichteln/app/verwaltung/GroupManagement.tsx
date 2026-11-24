import Link from 'next/link'
import type { Group } from '@/lib/store'
import { CopyInviteLink, OwnerForm, OwnParticipationForm, SubmitButton } from '../components'
import { setOwner } from '../admin/actions'
import { deleteGroup, joinOwnGroup, leaveOwnGroup, removeParticipant, startSelection } from './actions'

export interface GroupManagementProps {
  group: Group
  role: 'admin' | 'owner'
  /** The viewing owner's account; `null` for the administrator. */
  viewerAccountId: string | null
  /** All accounts, for the administrator's owner selection. */
  accounts: { id: string; name: string }[]
}

/** The management view of a group, shared by the administrator and the group's owner. */
export function GroupManagement({ group, role, viewerAccountId, accounts }: GroupManagementProps) {
  const isAdmin = role === 'admin'
  const home = isAdmin ? '/admin' : '/'
  const self = viewerAccountId ? group.users.find(u => u.accountId === viewerAccountId) : undefined
  const inWishes = group.phase === 'wishes'
  const done = group.users.filter(u => (inWishes ? u.wish : u.selectedWishOf)).length
  const total = group.users.length
  const canStart = inWishes && total >= 2 && done === total

  return (
    <>
      <Link href={home} className="small">
        {isAdmin ? '← Alle Gruppen' : '← Meine Gruppen'}
      </Link>
      <div className="row">
        <h1>{group.name}</h1>
        <span className="badge">{inWishes ? 'Phase 1 · Wünsche' : 'Phase 2 · Auswahl'}</span>
      </div>

      <section className="card">
        <h2>So funktioniert die Gruppe</h2>
        <ul className="muted">
          <li>Phase 1 · Wünsche: Alle Teilnehmenden tragen ihren Wunsch ein.</li>
          <li>
            Phase 2 · Auswahl: Jede teilnehmende Person wählt anonym den Wunsch einer anderen Person. Starte sie, sobald alle einen Wunsch eingetragen haben.
          </li>
          <li>Teilnehmende hinzufügen: Schicke ihnen den Einladungslink. In Phase 1 registrieren sie sich darüber oder melden sich mit ihrem Konto an.</li>
          <li>
            Teilnehmende entfernen: In Phase 1 mit „Entfernen“ in der Liste. Mit dem Start von Phase 2 sind Beitritt, Registrierung und Entfernen geschlossen.
          </li>
        </ul>
      </section>

      {isAdmin ? (
        <section className="card">
          <h2>Besitzer</h2>
          <p className="muted">
            {group.ownerName ? `Diese Gruppe gehört ${group.ownerName}.` : 'Diese Gruppe hat keinen Besitzer, nur du verwaltest sie.'} Die Besitzerin oder der
            Besitzer kann die Gruppe ebenfalls verwalten. Passwörter setzt nur der Admin unter „Konten“ zurück.
          </p>
          <OwnerForm accounts={accounts} ownerAccountId={group.ownerAccountId} action={setOwner.bind(null, group.id)} />
        </section>
      ) : (
        (inWishes || self) && (
          <section className="card">
            <h2>Deine Teilnahme</h2>
            <p className="muted">
              {self
                ? 'Du nimmst selbst an dieser Gruppe teil.'
                : 'Du verwaltest diese Gruppe, nimmst aber nicht teil. Du kannst dich in Phase 1 selbst hinzufügen.'}
            </p>
            {inWishes && <OwnParticipationForm participates={Boolean(self)} action={(self ? leaveOwnGroup : joinOwnGroup).bind(null, group.id)} />}
          </section>
        )
      )}

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
            {done} /{total}
          </span>
        </div>
        <div className="progress">
          <div style={{ width: `${String(total ? (done / total) * 100 : 0)}%` }} />
        </div>

        <ul className="list">
          {group.users.map(u => {
            const ok = inWishes ? Boolean(u.wish) : Boolean(u.selectedWishOf)
            return (
              <li key={u.id}>
                <div className="participant">
                  <strong>{u.name}</strong>
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
          <Link href={`${isAdmin ? '/admin' : '/verwaltung'}/${group.id}`} className="small">
            Aktualisieren
          </Link>
        </div>
      </section>

      {inWishes ? (
        <>
          <section className="card">
            <h2>Phase 2 starten</h2>
            <p className="muted">
              Sobald alle Teilnehmenden ihren Wunsch eingetragen haben, kannst du die Auswahlphase starten. Danach können Wünsche nicht mehr geändert werden.
            </p>
            <form action={startSelection.bind(null, group.id)}>
              <SubmitButton className="full" disabled={!canStart} confirm="Auswahlphase jetzt starten? Wünsche können danach nicht mehr geändert werden.">
                Auswahlphase starten
              </SubmitButton>
            </form>
            {!canStart && (
              <p className="muted small">{total < 2 ? 'Es braucht mindestens zwei Teilnehmende.' : `Es fehlen noch ${String(total - done)} Wünsche.`}</p>
            )}
          </section>
        </>
      ) : (
        done === total && (
          <section className="card">
            <div className="alert ok">Alle haben einen Wunsch gewählt. Das Wichteln ist komplett verteilt! 🎉</div>
          </section>
        )
      )}

      <section className="card">
        <h2>Gruppe löschen</h2>
        <form action={deleteGroup.bind(null, group.id)}>
          <SubmitButton className="secondary" confirm={`Gruppe „${group.name}“ mit allen Daten endgültig löschen?`}>
            Gruppe löschen
          </SubmitButton>
        </form>
      </section>
    </>
  )
}
