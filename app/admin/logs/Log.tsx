import styles from './Log.module.css'

export interface LogProbs {
  lines: string[]
}

export function Log({ lines }: LogProbs) {
  return (
    <>
      {lines.map((l, index) => {
        const level = l.substring(27, 40).split(':')[0].trim()
        return (
          <div key={index} className={styles[level]}>
            {l}
          </div>
        )
      })}
    </>
  )
}
