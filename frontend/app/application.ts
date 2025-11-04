import type { UIMatch } from 'react-router'

export interface Application {
  name: string
  links: { text: string, href: string }[]
}

export const defaultApplication: Application = {
  name: 'Homeserver',
  links: [],
}

export function getApplicationFromMatches(matches: UIMatch[]): Application {
  const typed = matches as UIMatch<unknown, undefined | { application: Application }>[]
  return typed.find(m => m.handle?.application)?.handle?.application ?? defaultApplication
}
