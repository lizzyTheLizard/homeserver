import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import style from './page.module.css'
import { DataTable } from '@/app/shared/components/DataTable'
import { getUserSession } from '@/app/common/auth/lib'
import { transactional } from '@/app/db'
import { findProfilesByOwner } from '../Profile'
import { findTemplatesByOwner } from '../Template'
import { Sidebar } from '@/app/shared/components/Sidebar'
import { TemplateRow } from './components/TemplateRow'
import { ProfileRow } from './components/ProfileRow'
import { TemplateCreateButton } from './components/TemplateCreateButton'
import { ProfileCreateButton } from './components/ProfileCreateButton'

export const metadata: Metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  const user = await getUserSession()
  if (!user) throw new Error('User not authenticated')
  const templates = await transactional(client => findTemplatesByOwner(client, user.sub))
  const profiles = await transactional(client => findProfilesByOwner(client, user.sub))

  return (
    <main className={style.main}>
      <Sidebar>
        <h1>Profiles</h1>
        <DataTable>
          <thead>
            <tr>
              <th className={style.language}>Language</th>
              <th className={style.updated}>Last Updated</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => (<ProfileRow key={profile.language} profile={profile} />))}
          </tbody>
        </DataTable>
        <ProfileCreateButton />

        <h1>Templates</h1>
        <DataTable>
          <thead>
            <tr>
              <th className={style.language}>Name</th>
              <th className={style.updated}>Last Updated</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (<TemplateRow key={template.id} template={template} />))}
          </tbody>
        </DataTable>
        <TemplateCreateButton />
      </Sidebar>
    </main>
  )
}
