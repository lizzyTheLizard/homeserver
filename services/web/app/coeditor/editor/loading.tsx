import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Editor } from './_components/Editor'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import type { Template } from '../_data/Template'
import { Temporal } from '@js-temporal/polyfill'

export default function Loading() {
  const dummyTemplate: Template = {
    created_at: Temporal.Now.instant().toString(),
    id: 'dummy-template',
    language: '',
    name: '',
    owner_email: 'system',
    parameters: [],
    text: 'This is a dummy template used during loading state.',
    updated_at: Temporal.Now.instant().toString(),
  }

  return (
    <>
      <ActionTitle>
        <h1>CoEditor</h1>
      </ActionTitle>
      <LoadingSpinner />
      <Editor templates={[dummyTemplate]} />
    </>
  )
}
