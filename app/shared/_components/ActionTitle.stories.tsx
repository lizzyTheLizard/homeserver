import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ActionTitle } from './ActionTitle'
import { expect, fn } from 'storybook/test'
import { Button } from './form/Button'

const meta = {
  title: 'Shared/ActionTitle',
  component: ActionTitle,
  tags: ['autodocs'],
  globals: {
    viewport: { value: undefined },
  },
} satisfies Meta<typeof ActionTitle>
export default meta

export const Normal: StoryObj<typeof meta> = {
}

export const ButtonStory: StoryObj<typeof meta> = {
  args: {
    children: [
      <h1>Action Title</h1>,
      <Button onClick={fn()}>New</Button>,
    ],
  },
}

const testFn = fn()
export const SingleAction: StoryObj<typeof meta> = {
  args: {
    children: [
      <h1>Action Title</h1>,
      <Button onClick={testFn}>New</Button>,
    ],
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button')
    button?.click()
    await expect(testFn).toHaveBeenCalled()
  },
}

export const MultipleActions: StoryObj<typeof meta> = {
  args: {
    children: [
      <h1>Action Title</h1>,
      <Button onClick={testFn}>New1</Button>,
      <Button onClick={testFn}>New2</Button>,
      <Button onClick={testFn}>New3</Button>,
    ],
  },
}

export const Mobile: StoryObj<typeof meta> = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  args: {
    children: [
      <h1>Action Title</h1>,
      <Button onClick={fn()}>New1</Button>,
      <Button onClick={fn()}>New2</Button>,
      <Button onClick={fn()}>New3</Button>,
    ],
  },
}
