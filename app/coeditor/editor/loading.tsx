import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Template } from '../_data/Template'
import { Editor } from './_components/Editor'
import { Temporal } from '@js-temporal/polyfill'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  const dummyTemplate: Template = {
    id: 'dummy-template',
    name: '',
    created_at: Temporal.Now.instant().toString(),
    updated_at: Temporal.Now.instant().toString(),
    language: '',
    text: 'This is a dummy template used during loading state.',
    parameters: [],
    owner_id: 'system',
  }

  return (
    <>
      <ActionTitle>
        <h1>CoEditor</h1>
      </ActionTitle>
      <LoadingSpinner></LoadingSpinner>
      <Editor templates={[dummyTemplate]} />
    </>
  )
}
