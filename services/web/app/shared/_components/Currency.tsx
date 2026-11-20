import { useSyncExternalStore } from 'react'
import style from './Currency.module.css'
import { config } from '../config'

export interface CurrencyProps {
  amount: number
  locale?: string
  currency?: string
}

// UseSyncExternalStore avoids hydration mismatch by returning false on the server and true on the client
// See https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
// oxlint-disable-next-line typescript/no-empty-function
const subscribe = () => () => {}

export function Currency({ amount }: CurrencyProps) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false)
  if (!isClient) {return null}

  return (
    <span className={amount < 0 ? style.negative : style.positive}>
      {amount.toLocaleString(config.NODE_PUBLIC_LOCALE, { currency: config.NODE_PUBLIC_CURRENCY, style: 'currency' })}
    </span>
  )
}
