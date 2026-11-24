const ALLOWED = /^\/(?:g\/[a-z0-9-]{1,80}|(?:gruppen|verwaltung)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/

/**
 * Returns `value` if it is an in-app path a sign-in may continue to (the start
 * page, an invite page, a group page or a group management page), otherwise `/`. Prevents open redirects.
 */
export function safeContinuePath(value: string | null | undefined): string {
  return value && ALLOWED.test(value) ? value : '/'
}

/** Path of the change-password page that continues to `target` afterwards. */
export function changePasswordPath(target: string): string {
  const safe = safeContinuePath(target)
  return safe === '/' ? '/passwort' : `/passwort?weiter=${encodeURIComponent(safe)}`
}
