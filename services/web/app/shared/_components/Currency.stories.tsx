import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Currency } from './Currency'

const meta = {
  component: Currency,
  tags: ['autodocs'],
  title: 'Shared/Currency',
} satisfies Meta<typeof Currency>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    amount: 1234.56,
  },
}

export const Zero: StoryObj = {
  args: {
    amount: 0,
  },
}

export const Negative: StoryObj = {
  args: {
    amount: -987.65,
  },
}
