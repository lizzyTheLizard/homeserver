import { useSyncExternalStore } from 'react'

/**
 * Returns `false` on the server, `true` after hydration.
 * Use to guard client-only rendering without triggering hydration mismatch warnings.
 * For content that merely *differs* between server and client, use `suppressHydrationWarning` instead.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(() => () => { /* empty */ }, () => true, () => false)
}
