import Link from 'next/link'
import { AccountType } from '../_data/AccountType'
import { AccountBadgeIconColor, AccountBadgeIcon } from './AccountBadgeIcons'

export function AccountBadge({ type, name, link }: { type: AccountType, name: string, link?: string }) {
  const content = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
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
    return <Link href={link} onClick={(e) => { e.stopPropagation() }}>{content}</Link>
  else
    return content
}
