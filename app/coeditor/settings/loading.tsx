import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Settings } from './Settings'
import { deleteProfile } from './deleteProfile'
import { updateProfile } from './updateProfile'

export default function Loading() {
  return (
    <>
      <LoadingSpinner></LoadingSpinner>
      <Settings
        profiles={[]}
        templates={[]}
        onDeleteProfile={deleteProfile}
        onSaveProfile={updateProfile}
      />
    </>
  )
}
