"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { login, saveWish, selectWish, type FormState } from "./actions";
import { createGroup } from "./admin/actions";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <div className="alert error">{state.error}</div>;
  if (state?.ok) return <div className="alert ok">{state.ok}</div>;
  return null;
}

export function SubmitButton({
  children,
  className,
  confirm,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Bitte warten…" : children}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
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
  );
}

export function WishForm({ title, description }: { title?: string; description?: string }) {
  const [state, action] = useActionState(saveWish, undefined);
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
      <SubmitButton className="full">{title ? "Wunsch aktualisieren" : "Wunsch speichern"}</SubmitButton>
    </form>
  );
}

export function WishPicker({ wishes }: { wishes: { ownerId: string; title: string; description: string }[] }) {
  const [state, action] = useActionState(selectWish, undefined);
  return (
    <div className="stack">
      <Message state={state} />
      {wishes.map((w) => (
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
  );
}

export function CreateGroupForm() {
  const [state, action] = useActionState(createGroup, undefined);
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="name">Gruppenname</label>
        <input id="name" name="name" placeholder="z. B. Team Weihnachten 2026" required />
      </div>
      <div>
        <label htmlFor="names">Teilnehmende</label>
        <textarea id="names" name="names" placeholder={"Anna\nBen\nCarla"} required />
        <span className="muted small">Ein Name pro Zeile (oder durch Komma getrennt). Der Name ist der Benutzername.</span>
      </div>
      <Message state={state} />
      <SubmitButton className="full">Gruppe erstellen</SubmitButton>
    </form>
  );
}

export function AddParticipantsForm({
  action: boundAction,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, action] = useActionState(boundAction, undefined);
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="add-names">Weitere Teilnehmende</label>
        <textarea id="add-names" name="names" placeholder="Ein Name pro Zeile" style={{ minHeight: 70 }} />
      </div>
      <Message state={state} />
      <SubmitButton className="secondary">Hinzufügen</SubmitButton>
    </form>
  );
}

export function CopyCredentials({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="secondary"
      onClick={async () => {
        const full = `Wichteln – Anmeldung unter ${window.location.origin}\n\n${text}`;
        try {
          await navigator.clipboard.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Zugangsdaten kopieren:", full);
        }
      }}
    >
      {copied ? "Kopiert ✓" : "Alle Zugangsdaten kopieren"}
    </button>
  );
}
