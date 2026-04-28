import { useSyncExternalStore } from 'react'
import style from './Currency.module.css'
import { config } from '../config'

export interface CurrencyProps {
  amount: number
  locale?: string
  currency?: string
}

// useSyncExternalStore avoids hydration mismatch by returning false on the server and true on the client
// see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
// eslint-disable-next-line @typescript-eslint/no-empty-function
const subscribe = () => () => {}

export function Currency({ amount }: CurrencyProps) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false)
  if (!isClient) return null

  return (
    <span className={amount < 0 ? style.negative : style.positive}>
      {amount.toLocaleString(config.NODE_PUBLIC_LOCALE, { style: 'currency', currency: config.NODE_PUBLIC_CURRENCY })}
    </span>
  )
}
