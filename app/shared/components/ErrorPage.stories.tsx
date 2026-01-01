import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ErrorPage } from './ErrorPage'

const meta = {
  title: 'Shared/ErrorPage',
  component: ErrorPage,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorPage>
export default meta

export const Normal: StoryObj<typeof meta> = {
  args: {
    name: 'NotFoundError',
    message: 'The requested resource was not found on the server.',
  },
}

export const ErrorInput: StoryObj = {
  args: {
    error: new Error('Something went wrong while processing your request. Please try again later.'),
  },
}
