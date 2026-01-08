import style from './Currency.module.css'

export function Currency({ amount }: { amount: number }) {
  return (
    <span className={amount < 0 ? style.negative : style.positive}>
      {amount.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })}
    </span>
  )
}
