import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Template } from '../Template'
import Editor from './Editor'

export default function Loading() {
  const dummyTemplate: Template = {
    id: 'dummy-template',
    name: '',
    created_at: new Date(),
    updated_at: new Date(),
    language: '',
    text: 'This is a dummy template used during loading state.',
    parameters: [],
    owner_id: 'system',
  }

  return (
    <main>
      <h1>CoEditor</h1>
      <LoadingSpinner></LoadingSpinner>
      <Editor discussion={undefined} templates={[dummyTemplate]} />
    </main>
  )
}
