import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Template } from '../_data/Template'
import { Editor } from './Editor'

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
    <>
      <LoadingSpinner></LoadingSpinner>
      <Editor templates={[dummyTemplate]} />
    </>
  )
}
