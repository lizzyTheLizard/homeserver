import { AccountBadgeIcon, AccountBadgeIconColor } from './AccountBadgeIcons'
import type { AccountType } from '../_data/AccountType'
import Link from 'next/link'

export function AccountBadge({ type, name, link, tabIndex }: { type: AccountType, name: string, link?: string, tabIndex?: number }) {
  const content = (
    <span style={{ alignItems: 'center', display: 'inline-flex', gap: '0.4rem' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill={AccountBadgeIconColor[type]}
        style={{ flexShrink: 0 }}
      >
        <path d={AccountBadgeIcon[type]} />
      </svg>
      <span>{name}</span>
    </span>
  )

  if (link)
    {return <Link href={link} tabIndex={tabIndex} onClick={(e) => { e.stopPropagation() }}>{content}</Link>}
  else
    {return content}
}
