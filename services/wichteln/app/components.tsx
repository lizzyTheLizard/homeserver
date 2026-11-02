'use client'

import { useActionState, useState, useSyncExternalStore } from 'react'
import { useFormStatus } from 'react-dom'
import { groupLogin, login, register, saveWish, selectWish, type FormState } from './actions'
import { createGroup } from './admin/actions'

function Message({ state }: { state: FormState }) {
  if (state?.error) return <div className="alert error">{state.error}</div>
  if (state?.ok) return <div className="alert ok">{state.ok}</div>
  return null
}

export function SubmitButton({
  children,
  className,
  confirm,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  confirm?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {pending ? 'Bitte warten…' : children}
    </button>
  )
}

export function LoginForm() {
  const [state, action] = useActionState(login, undefined)
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="username">Benutzername</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label htmlFor="password">Passwort</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Message state={state} />
      <SubmitButton className="full">Anmelden</SubmitButton>
    </form>
  )
}

export function GroupLoginForm({ token }: { token: string }) {
  const [state, action] = useActionState(groupLogin, undefined)
  return (
    <form action={action} className="stack">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="login-name">Name</label>
        <input id="login-name" name="name" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label htmlFor="login-password">Passwort</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Message state={state} />
      <SubmitButton className="full">Anmelden</SubmitButton>
    </form>
  )
}

export function RegisterForm({ token }: { token: string }) {
  const [state, action] = useActionState(register, undefined)
  return (
    <form action={action} className="stack">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="register-name">Name</label>
        <input id="register-name" name="name" autoComplete="username" maxLength={60} required />
        <span className="muted small">Damit meldest du dich später wieder an.</span>
      </div>
      <div>
        <label htmlFor="register-password">Passwort</label>
        <input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required />
        <span className="muted small">Mindestens 8 Zeichen.</span>
      </div>
      <div>
        <label htmlFor="register-password-confirmation">Passwort wiederholen</label>
        <input
          id="register-password-confirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={200}
          required
        />
      </div>
      <Message state={state} />
      <SubmitButton className="full">Registrieren</SubmitButton>
    </form>
  )
}

export function WishForm({ title, description }: { title?: string, description?: string }) {
  const [state, action] = useActionState(saveWish, undefined)
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="title">Titel</label>
        <input id="title" name="title" defaultValue={title} maxLength={120} required />
      </div>
      <div>
        <label htmlFor="description">Beschreibung</label>
        <textarea id="description" name="description" defaultValue={description} maxLength={2000} required />
      </div>
      <Message state={state} />
      <SubmitButton className="full">{title ? 'Wunsch aktualisieren' : 'Wunsch speichern'}</SubmitButton>
    </form>
  )
}

export function WishPicker({ wishes }: { wishes: { ownerId: string, title: string, description: string }[] }) {
  const [state, action] = useActionState(selectWish, undefined)
  return (
    <div className="stack">
      <Message state={state} />
      {wishes.map(w => (
        <form key={w.ownerId} action={action} className="wish">
          <input type="hidden" name="ownerId" value={w.ownerId} />
          <h3>{w.title}</h3>
          <p>{w.description}</p>
          <SubmitButton
            className="full"
            confirm={`Möchtest du den Wunsch „${w.title}“ erfüllen? Die Auswahl kann nicht rückgängig gemacht werden.`}
          >
            Diesen Wunsch erfüllen
          </SubmitButton>
        </form>
      ))}
    </div>
  )
}

export function CreateGroupForm() {
  const [state, action] = useActionState(createGroup, undefined)
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="name">Gruppenname</label>
        <input id="name" name="name" placeholder="z. B. Team Weihnachten 2026" required />
      </div>
      <p className="muted small">Danach erhältst du einen Einladungslink, über den sich die Teilnehmenden selbst registrieren.</p>
      <Message state={state} />
      <SubmitButton className="full">Gruppe erstellen</SubmitButton>
    </form>
  )
}

export function ResetPasswordForm({
  name,
  action: boundAction,
}: {
  name: string
  action: (prev: FormState) => Promise<FormState>
}) {
  const [state, action] = useActionState(boundAction, undefined)
  return (
    <form action={action} className="reset-password">
      <SubmitButton className="link" confirm={`Passwort von ${name} wirklich zurücksetzen?`}>
        Passwort zurücksetzen
      </SubmitButton>
      {state?.ok && (
        <span className="small">
          Neues Passwort:
          {' '}
          <code>{state.ok}</code>
        </span>
      )}
      {state?.error && <span className="small error-text">{state.error}</span>}
    </form>
  )
}

export function CopyInviteLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => '')
  const link = `${origin}${path}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => { setCopied(false) }, 2000)
    }
    catch {
      window.prompt('Einladungslink kopieren:', link)
    }
  }

  return (
    <div className="invite-link">
      <code>{link}</code>
      <button type="button" className="secondary" onClick={() => { void copy() }}>
        {copied ? 'Kopiert ✓' : 'Einladungslink kopieren'}
      </button>
    </div>
  )
}

/** The page origin never changes, so there is nothing to subscribe to. */
function subscribeNever() {
  return () => { /* nothing to unsubscribe */ }
}
