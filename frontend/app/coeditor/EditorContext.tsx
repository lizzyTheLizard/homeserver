import { GsCollapse } from 'homeserver-webcomponents/react'

interface Props {
  onContextChange: (context: string) => void
}

// TODO: Implement context editing
export default function EditorContext({ onContextChange }: Props) {
  return (
    <GsCollapse header="Context">
      Context
    </GsCollapse>
  )
}
