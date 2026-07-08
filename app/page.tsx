import { AiChatWindow } from './startpage/_components/AiChatWindow'
import { Clock } from './startpage/_components/Clock'
import styles from './page.module.css'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default function Page() {
  return (
    <main className={styles.main}>
      <Clock />
      <AiChatWindow />
    </main>
  )
}
