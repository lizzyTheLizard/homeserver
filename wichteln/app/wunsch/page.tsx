import { requireUser } from '@/lib/session'
import { selectableWishOwners } from '@/lib/matching'
import type { Group, User, Wish } from '@/lib/store'
import { logout } from '../actions'
import { WishForm, WishPicker } from '../components'

export const dynamic = 'force-dynamic'

export default async function WishPage() {
  const { group, user } = await requireUser()

  return (
    <>
      <div className="row">
        <div>
          <h1>
            Hallo
            {user.name}
            !
          </h1>
          <span className="muted">
            Gruppe:
            {group.name}
          </span>
        </div>
        <form action={logout}>
          <button className="secondary">Abmelden</button>
        </form>
      </div>

      {group.phase === 'wishes' ? <WishPhase wish={user.wish} /> : <SelectionPhase group={group} user={user} />}
    </>
  )
}

function WishPhase({ wish }: { wish: Wish | null }) {
  return (
    <section className="card">
      <div className="row">
        <h2>Dein Wunsch</h2>
        {wish ? <span className="badge done">Eingetragen ✓</span> : <span className="badge open">Noch offen</span>}
      </div>
      <p className="muted">
        {wish
          ? 'Du kannst deinen Wunsch noch ändern, bis die Auswahlphase startet.'
          : 'Trage hier deinen Wunsch ein. Andere sehen später nur Titel und Beschreibung – nicht, von wem er stammt.'}
      </p>
      <WishForm title={wish?.title} description={wish?.description} />
    </section>
  )
}

function SelectionPhase({ group, user }: { group: Group, user: User }) {
  const chosen = user.selectedWishOf ? group.users.find(u => u.id === user.selectedWishOf)?.wish : null

  if (chosen) {
    return (
      <section className="card">
        <h2>Dein Wichtel-Auftrag 🎄</h2>
        <p className="muted">Diesen Wunsch hast du gewählt und erfüllst ihn:</p>
        <div className="wish chosen">
          <h3>{chosen.title}</h3>
          <p>{chosen.description}</p>
        </div>
      </section>
    )
  }

  const wishes = selectableWishOwners(group, user.id).flatMap((ownerId) => {
    const w = group.users.find(u => u.id === ownerId)?.wish
    if (!w) return []
    return [{ ownerId, title: w.title, description: w.description }]
  })

  return (
    <section className="card">
      <div className="row">
        <h2>Wähle einen Wunsch</h2>
        <a href="/wunsch" className="small">
          Aktualisieren
        </a>
      </div>
      <p className="muted">
        Wähle einen Wunsch, den du erfüllen möchtest. Sobald du ihn gewählt hast, ist er für die anderen nicht mehr
        sichtbar.
      </p>
      {wishes.length > 0
        ? (
            <WishPicker wishes={wishes} />
          )
        : (
            <div className="alert error">Momentan ist kein Wunsch verfügbar. Bitte melde dich beim Admin.</div>
          )}
    </section>
  )
}
