import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Editor } from './_components/Editor'
import { loadEditorData } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'CoEditor',
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return serverPageFunction(metadata.title, async () => {
    const discussionId = (await searchParams).id as string | undefined
    const editorData = await loadEditorData(discussionId)
    return (
      <main>
        <ActionTitle>
          <h1>CoEditor</h1>
        </ActionTitle>
        <Editor discussion={editorData.discussion} templates={editorData.templates} />
      </main>
    )
  })
}
