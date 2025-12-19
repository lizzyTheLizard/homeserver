import Editor from './Editor'
import { executeCommand } from './executeCommand'

export default function Loading() {
  return (
    <Editor discussion={undefined} templates={[]} executeCommand={executeCommand} />
  )
}
