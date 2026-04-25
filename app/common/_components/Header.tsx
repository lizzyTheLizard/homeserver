'use client'

import style from './Header.module.css'
import { Application, applications } from '../Application'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/app/shared/_components/Icon'

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
  const router = useRouter()
  const pathname = usePathname()
  const effectivePath = path ?? pathname
  const currentApplication = applications
    .filter(app => accessibleApplications.includes(app.key))
    .find(app => startWithIgnoreCase(effectivePath, app))
  const showPortalLink = currentApplication !== undefined && accessibleApplications.length > 1

  function linkClass(href: string, isMobile: boolean) {
    return [style.link, isMobile ? style.mobileLink : '', isActiveLink(href, effectivePath) ? style.activeLink : ''].join(' ')
  }

  return (
    <>
      <div className={style.container}>
        <span className={style.applicationName}>{currentApplication?.name ?? 'Homeserver'}</span>
        {(currentApplication?.getLinks(effectivePath) ?? []).map(link => (
          <Link key={link.href} href={link.href} className={linkClass(link.href, false)}>
            <span>{link.text}</span>
          </Link>
        ))}
        <div className={style.spacer} />
        {showPortalLink
          && (
            <>
              <Link href="/" className={linkClass('/', false)}>All Applications</Link>
              <Link href="/" className={linkClass('/', true)}><Icon style={{ width: '1.5rem', height: '1.5rem' }} name="home" /></Link>
            </>
          )}
        {hasSession && (
          <>
            <Link href="/common/auth/logout" className={linkClass('/common/auth/logout', false)}>Logout</Link>
            <Link href="/common/auth/logout" className={linkClass('/common/auth/logout', true)}><Icon style={{ width: '1.5rem', height: '1.5rem' }} name="logout" /></Link>
          </>
        )}
      </div>
      <div className={style.mobileContainer}>
        {(currentApplication?.getLinks(effectivePath) ?? []).map(link => (
          <button onClick={() => { router.push(link.href) }} key={link.href} className={style.button + ' ' + (isActiveLink(link.href, effectivePath) ? style.activeButton : '')}>
            <span>{link.text}</span>
          </button>
        ))}
      </div>
    </>
  )
}
