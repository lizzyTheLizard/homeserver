export const NAME_MAX = 60
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 200

/** Checks self-registration input; returns a user-facing error or `null`. Expects a trimmed name. */
export function registrationError(name: string, password: string, confirmation: string): string | null {
  if (!name) return 'Bitte einen Namen eingeben.'
  if (name.length > NAME_MAX) return `Der Name ist zu lang (max. ${String(NAME_MAX)} Zeichen).`
  if (password.length < PASSWORD_MIN) return `Das Passwort muss mindestens ${String(PASSWORD_MIN)} Zeichen lang sein.`
  if (password.length > PASSWORD_MAX) return `Das Passwort ist zu lang (max. ${String(PASSWORD_MAX)} Zeichen).`
  if (password !== confirmation) return 'Die Passwörter stimmen nicht überein.'
  return null
}
