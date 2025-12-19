import { Settings } from './Settings'
import { deleteProfile } from './deleteProfile'
import { updateProfile } from './updateProfile'

export default function Loading() {
  return (
    <Settings
      profiles={[]}
      templates={[]}
      onDeleteProfile={deleteProfile}
      onSaveProfile={updateProfile}
    />
  )
}
