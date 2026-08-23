import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AccountBadge } from './AccountBadge'
import { ACCOUNT_TYPES } from '../_data/AccountType'

const meta = {
  title: 'Cash/AccountBadge',
  component: AccountBadge,
  tags: ['autodocs'],
  args: { name: 'Bank Account', type: 'Cash' },
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
