'use client'

import style from './Header.module.css'
import { Application, applications } from '@/app/shared/Application'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const effectivePath = path ?? pathname
  const isStartPage = effectivePath === '/'
  const currentApplication = applications
    .filter(app => accessibleApplications.includes(app.key))
    .find(app => startWithIgnoreCase(effectivePath, app))
  const showPortalLink = currentApplication !== undefined && accessibleApplications.length > 1

  function linkClass(href: string, isMobile: boolean) {
    return [style.link, isMobile ? style.mobileLink : '', isActiveLink(href, effectivePath) ? style.activeLink : ''].join(' ')
  }

  function appLinkClass(href: string) {
    return style.appLink + (isActiveLink(href, effectivePath) ? ' ' + style.activeAppLink : '')
  }

  function tabLinkClass(href: string) {
    return style.tabLink + (isActiveLink(href, effectivePath) ? ' ' + style.activeTabLink : '')
  }

  function buttonClass(href: string) {
    return style.button + (isActiveLink(href, effectivePath) ? ' ' + style.activeButton : '')
  }

  return (
    <div className={style.headerGroup}>
      {isStartPage
        ? (
            <>
              <div className={style.container}>
                <span className={style.siteName}>Homeserver</span>
                <nav className={style.appNav}>
                  {applications
                    .filter(app => accessibleApplications.includes(app.key))
                    .map(app => (
                      <Link key={app.key} href={app.link} className={appLinkClass(app.link)}>
                        <Icon name={app.icon as 'startpage' | 'cash' | 'admin' | 'coeditor'} style={{ width: '1rem', height: '1rem' }} />
                        <span>{app.name}</span>
                      </Link>
                    ))}
                </nav>
                <div className={style.spacer} />
                {hasSession && (
                  <>
                    <a href="/shared/auth/logout" className={linkClass('/shared/auth/logout', false)}>Logout</a>
                    <a href="/shared/auth/logout" className={linkClass('/shared/auth/logout', true)}><Icon style={{ width: '1.5rem', height: '1.5rem' }} name="logout" /></a>
                  </>
                )}
              </div>
              <div className={style.mobileTabs}>
                {applications
                  .filter(app => accessibleApplications.includes(app.key))
                  .map(app => (
                    <Link key={app.key} href={app.link} className={tabLinkClass(app.link)}>
                      <Icon name={app.icon as 'startpage' | 'cash' | 'admin' | 'coeditor'} style={{ width: '1.1rem', height: '1.1rem' }} />
                      <span>{app.name}</span>
                    </Link>
                  ))}
              </div>
            </>
          )
        : (
            <>
              <div className={style.container}>
                <span className={style.applicationName}>{currentApplication?.name ?? 'Homeserver'}</span>
                {(currentApplication?.getLinks(effectivePath) ?? []).map(link => (
                  <Link key={link.href} href={link.href} className={linkClass(link.href, false)}>
                    <span>{link.text}</span>
                  </Link>
                ))}
                <div className={style.spacer} />
                {showPortalLink && (
                  <>
                    <Link href="/" className={linkClass('/', false)}>All Applications</Link>
                    <Link href="/" className={linkClass('/', true)}><Icon style={{ width: '1.5rem', height: '1.5rem' }} name="home" /></Link>
                  </>
                )}
                {hasSession && (
                  <>
                    <a href="/shared/auth/logout" className={linkClass('/shared/auth/logout', false)}>Logout</a>
                    <a href="/shared/auth/logout" className={linkClass('/shared/auth/logout', true)}><Icon style={{ width: '1.5rem', height: '1.5rem' }} name="logout" /></a>
                  </>
                )}
              </div>
              <div className={style.mobileContainer}>
                {(currentApplication?.getLinks(effectivePath) ?? []).filter(link => !link.hideMobile).map(link => (
                  <Link key={link.href} href={link.href} className={buttonClass(link.href)}>
                    <span>{link.text}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
    </div>
  )
}
