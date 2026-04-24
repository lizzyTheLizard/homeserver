'use client'

import style from './Header.module.css'
import { Application, applications } from '../Application'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

function startWithIgnoreCase(path: string, app: Application) {
  const split = app.link.split('/')
  const prefix = '/' + split[1]
  return path.toLowerCase().startsWith(prefix.toLowerCase())
}

function isActiveLink(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/'
  const lower = href.toLowerCase()
  const lowerPath = currentPath.toLowerCase()
  return lowerPath === lower || lowerPath.startsWith(lower + '/')
}

export interface HeaderProps {
  accessibleApplications: string[]
  hasSession: boolean
  path?: string
}

export function Header({ accessibleApplications, hasSession, path }: HeaderProps) {
  const pathname = usePathname()
  const effectivePath = path ?? pathname
  const currentApplication = applications
    .filter(app => accessibleApplications.includes(app.key))
    .find(app => startWithIgnoreCase(effectivePath, app))
  const showPortalLink = currentApplication !== undefined && accessibleApplications.length > 1

  function navLinkClass(href: string) {
    return [style.link, isActiveLink(href, effectivePath) ? style.activeLink : ''].join(' ')
  }

  function utilityLinkClass(href: string) {
    return [style.link, style.utilityLink, isActiveLink(href, effectivePath) ? style.activeLink : ''].join(' ')
  }

  return (
    <div className={style.container}>
      <span className={style.applicationName}>{currentApplication?.name ?? 'Homeserver'}</span>
      {(currentApplication?.getLinks(effectivePath).length ?? 0) !== 0 && (
        <div className={style.links}>
          {(currentApplication?.getLinks(effectivePath) ?? []).map(link => (
            <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
              <span>{link.text}</span>
            </Link>
          ))}
        </div>
      )}
      <div className={style.spacer} />
      {showPortalLink && <Link href="/" className={utilityLinkClass('/')}>All Applications</Link>}
      {hasSession && <a href="/common/auth/logout" className={utilityLinkClass('/common/auth/logout')}>Logout</a>}
    </div>
  )
}
