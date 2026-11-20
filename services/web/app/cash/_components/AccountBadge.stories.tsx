import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ACCOUNT_TYPES } from '../_data/AccountType'
import { AccountBadge } from './AccountBadge'

const meta = {
  args: { name: 'Bank Account', type: 'Cash' },
  component: AccountBadge,
  tags: ['autodocs'],
  title: 'Cash/AccountBadge',
} satisfies Meta<typeof AccountBadge>
export default meta

export const Default: StoryObj<typeof meta> = { }

export const Link: StoryObj<typeof meta> = { args: { link: '/cash/1/2024-01/journal?accountId=1' } }

export const AllTypes: StoryObj<typeof meta> = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
      {ACCOUNT_TYPES.map(type => (
        <AccountBadge key={type} name={`${type} Account`} type={type} />
      ))}
    </div>
  ),
}
