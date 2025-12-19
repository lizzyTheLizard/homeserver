import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import style from './page.module.css'
import { EditorContext } from './EditorContext'
import Textarea from '@/app/shared/components/Textarea'
import Input from '@/app/shared/components/Input'
import Button from '@/app/shared/components/Button'

export default function Loading() {
  return (
    <main className={style.main}>
      <LoadingSpinner />
      <title>CoEditor - Editor</title>
      <h1>CoEditor</h1>
      <EditorContext templates={[]} parameters={{}} template={undefined} />
      <Textarea className={style.textarea} disabled />
      <div className={style.chatRow}>
        <Input label="Custom Command" disabled />
        <Button disabled>Send</Button>
      </div>
      <div className={style.buttons + ' buttons row'}>
        <Button disabled>Improve</Button>
        <Button disabled>Reformulate</Button>
        <Button disabled>Summarize</Button>
        <Button disabled>Extend</Button>
        <Button disabled>Undo</Button>
        <Button disabled>Redo</Button>
        <Button disabled>New</Button>
      </div>
    </main>
  )
}
