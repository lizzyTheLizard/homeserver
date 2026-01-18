import { Editor } from './Editor'
import { loadEditorData } from './server'
import { serverPageFunction } from '@/app/shared/PageFunction'

export const metadata = {
  title: 'CoEditor',
}

export default async function Page({ searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return serverPageFunction(metadata.title, async () => {
    const discussionId = (await searchParams).id as string | undefined
    const editorData = await loadEditorData(discussionId)
    return (
      <Editor discussion={editorData.discussion} templates={editorData.templates} />
    )
  })
}
