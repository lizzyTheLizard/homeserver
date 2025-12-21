import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/db'
import { findProfilesByOwner } from '../Profile'
import { findTemplatesByOwner } from '../Template'
import { Settings } from './Settings'
import { updateProfile } from './updateProfile'
import { deleteProfile } from './deleteProfile'
import { updateTemplate } from './updateTemplate'
import { deleteTemplate } from './deleteTemplate'

export const metadata: Metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  const user = await getUserSession()
  if (!user) throw new Error('User not authenticated')
  const templates = await transactional(client => findTemplatesByOwner(client, user.sub))
  const profiles = await transactional(client => findProfilesByOwner(client, user.sub))

  return (
    <Settings
      profiles={profiles}
      templates={templates}
      onDeleteProfile={deleteProfile}
      onSaveProfile={updateProfile}
      onDeleteTemplate={deleteTemplate}
      onSaveTemplate={updateTemplate}
    />
  )
}
