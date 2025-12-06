import { use, useState } from 'react'
import { NavLink, useMatches } from 'react-router'
import { defaultApplication, getApplicationFromMatches, type Application } from '../Application.ts'
import { AuthContext, type User } from './auth/AuthContext'
import { GsIcon } from 'homeserver-webcomponents/react'
import style from './Header.module.css'

function showPortalAccess(user: User | undefined, application: Application) {
  if (!user) return false
  if (application === defaultApplication) return false
  return user.applications.length > 0
}

export function Header() {
  const matches = useMatches()
  const application = getApplicationFromMatches(matches)
  const [showMenu, setShowMenu] = useState(false)
  const user = use(AuthContext)
  const portalAccess = showPortalAccess(user, application)

  function toggle() {
    setShowMenu(!showMenu)
  }

  function getClasses(link: string) {
    const classes = [style.link]
    if (!showMenu) classes.push(style.mobileMenuHidden)
    if (link === document.location.pathname) classes.push(style.activeLink)
    return classes.join(' ')
  }

  return (
    <div className={style.container}>
      <GsIcon className={style.mobileMenuIcon} onClick={toggle} name="menu"></GsIcon>
      <span className={style.applicationName}>{application.name}</span>
      <div className={style.links}>
        {application.links.map(link =>
          <NavLink onClick={toggle} key={link.href} to={link.href} className={getClasses(link.href)}><div><span>{link.text}</span></div></NavLink>,
        )}
      </div>
      <div className={style.spacer}></div>
      {portalAccess ? (<NavLink to="/" onClick={toggle} className={getClasses('/')}>All Application</NavLink>) : ''}
      <NavLink onClick={toggle} to="/logout" className={getClasses('/logout')}>Logout</NavLink>
    </div>
  )
}
