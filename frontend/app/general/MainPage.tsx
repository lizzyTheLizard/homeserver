import { GsCard, GsIcon } from 'homeserver-webcomponents/react'

export default function MainPage() {
  // TODO: Show only relevant application based on user, go straigt if only one application
  return (
    <main>
      <div className="row">
        <GsCard header="Cash" href="cash/">
          <GsIcon name="cash" slot="icon" style={{ height: '5rem' }}></GsIcon>
          <p>Double bookkeeping application for privates</p>
        </GsCard>
        <GsCard header="Admin" href="admin/">
          <GsIcon name="admin" slot="icon" style={{ height: '5rem' }}></GsIcon>
          <p>General server admin</p>
        </GsCard>
        <GsCard header="CoEditor" href="coeditor/">
          <GsIcon name="coeditor" slot="icon" style={{ height: '5rem' }}></GsIcon>
          <p>Customizable AI-driven Editor</p>
        </GsCard>
      </div>
    </main>
  )
}
