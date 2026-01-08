import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Editor } from './Editor'
import { loadEditorData } from './server'

export const metadata: Metadata = {
  title: 'CoEditor',
}

export default async function Page({ searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const discussionId = (await searchParams).id as string | undefined
  const editorData = await loadEditorData(discussionId)
  return (
    <Editor discussion={editorData.discussion} templates={editorData.templates} />
  )
}
