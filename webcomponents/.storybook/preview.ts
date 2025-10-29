import type { Preview } from '@storybook/web-components-vite'
import { within as withinShadow } from 'shadow-dom-testing-library'
import '../src/main.scss'
import '../src/table.scss'

const preview: Preview = {
  tags: ['autodocs'],
  // 👇 Augment the canvas with the shadow DOM queries
  beforeEach({ canvasElement, canvas }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.assign(canvas, { ...withinShadow(canvasElement) })
  } }

// 👇 Extend TypeScript types for safety
export type ShadowQueries = ReturnType<typeof withinShadow>

declare module 'storybook/internal/csf' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Canvas extends ShadowQueries {}
}

export default preview
