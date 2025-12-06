import { GsCard, GsIcon } from 'homeserver-webcomponents/react'
import { useContext } from 'react'
import { AuthContext } from './auth/AuthContext'

const applications = [
  { key: 'app', icon: 'cash', name: 'Cash', link: 'cash/', description: 'Double bookkeeping application for privates' },
  { key: 'admin', icon: 'admin', name: 'Admin', link: 'admin/', description: 'General server admin' },
  { key: 'coeditor', icon: 'coeditor', name: 'CoEditor', link: 'coeditor/', description: 'Customizable AI-driven Editor' },
]

// TODO: Use NavLinks in GsCard when available
export default function MainPage() {
  const user = useContext(AuthContext)
  const content = user
    ? applications.filter(app => user.applications.includes(app.key)).map(app => (
        <GsCard header={app.name} href={app.link} key={app.key}>
          <GsIcon name={app.icon} slot="icon" style={{ height: '5rem' }}></GsIcon>
          <p>{app.description}</p>
        </GsCard>
      ))
    : (<p>You need to be logged in to see your applications.</p>)
  return (
    <main>
      <div className="row">
        {content}
      </div>
    </main>
  )
}
