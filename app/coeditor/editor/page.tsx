import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { findDiscussionById } from '../Discussion'
import { findTemplatesByOwner } from '../Template'
import Editor from './Editor'
import { getUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { executeCommand } from './executeCommand'

export const metadata: Metadata = {
  title: 'CoEditor',
}

export default async function Page({ searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUserSession()
  if (!user) throw new Error('User not authenticated')
  const existingDiscussionId = (await searchParams).id as string | undefined
  const { discussion, templates } = await transactional(async (client) => {
    const discussion = existingDiscussionId ? await findDiscussionById(client, existingDiscussionId) : undefined
    if (existingDiscussionId && !discussion) throw new Error('Discussion not found')
    if (discussion && discussion.owner_id !== user.sub) throw new Error('Unauthorized')
    const templates = await findTemplatesByOwner(client, user.sub)
    return { discussion, templates }
  })

  return (
    <main>
      <h1>CoEditor</h1>
      <Editor discussion={discussion} templates={templates} executeCommand={executeCommand} />
    </main>
  )
}
