import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AiMessageBubble } from './AiMessageBubble'

const meta = {
  title: 'Startpage/AiMessageBubble',
  component: AiMessageBubble,
  tags: ['autodocs'],
  argTypes: {
    role: { control: 'select', options: ['user', 'assistant'] },
    content: { control: 'text' },
    generating: { control: 'boolean' },
    stalled: { control: 'boolean' },
    editable: { control: 'boolean' },
  },
} satisfies Meta<typeof AiMessageBubble>
export default meta

export const UserMessage: StoryObj<typeof meta> = {
  args: {
    role: 'user',
    content: 'What is the weather like today?',
  },
}

export const AiMessage: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: 'The weather is currently sunny with a temperature of 22°C. Perfect for a walk!',
  },
}

export const AiMessageWithMarkdown: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: 'Here is some **bold text** and a [link](https://example.com).\n\n- Item 1\n- Item 2\n- Item 3',
  },
}

export const GeneratingEmpty: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: '',
    generating: true,
    stalled: false,
  },
}

export const GeneratingEmptyStalled: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: '',
    generating: true,
    stalled: true,
  },
}

export const GeneratingPartial: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: 'Here\'s your email summary:\n\n- Stefan Meier — Project meeting next Thursday at 14:00\n- Oliver Braun — Question about Q2 numbers, needs reply',
    generating: true,
    stalled: false,
  },
}

export const GeneratingPartialStalled: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: 'Sure! Here\'s a draft for Thomas:\n\n"Hey Thomas! Yes, I\'ll be there Saturday —',
    generating: true,
    stalled: true,
  },
}

const EDITABLE_CONTENT = 'Hi Thomas! I\'ve drafted a reply for you.\n\n~~~input\nHey Thomas! Yes, I\'ll be there Saturday — what time and where? Should I bring anything?\n~~~\n\nFeel free to edit the draft above before I send it.'

export const EditableBeforeEdit: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: EDITABLE_CONTENT,
    editable: true,
  },
}

export const EditableDuringEdit: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: EDITABLE_CONTENT,
    editable: true,
  },
  play: async ({ canvasElement }) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    const editableBlock = canvasElement.querySelector<HTMLElement>('[class*="editableView"]')
    if (editableBlock) {
      editableBlock.click()
    }
  },
}

export const EditableAfterEdit: StoryObj<typeof meta> = {
  args: {
    role: 'assistant',
    content: EDITABLE_CONTENT,
    editable: true,
  },
  play: async ({ canvasElement }) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    const editableBlock = canvasElement.querySelector<HTMLElement>('[class*="editableView"]')
    if (editableBlock) {
      editableBlock.click()
    }
    await new Promise(resolve => setTimeout(resolve, 150))
    const textarea = canvasElement.querySelector<HTMLTextAreaElement>('textarea')
    if (textarea) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      nativeInputValueSetter?.call(textarea, 'Hey Thomas! Yes, I\'ll be there Saturday at 19:00. Let me know if you need me to bring anything!')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    const okButton = Array.from(canvasElement.querySelectorAll('button')).find(btn => btn.textContent === 'OK')
    if (okButton) {
      okButton.click()
    }
  },
}

export const EditableResponse: StoryObj<typeof meta> = {
  args: {
    role: 'user',
    content: 'I updated the text\n~~~input\nHey Thomas! Yes, I\'ll be there Saturday — what time and where? Should I bring anything?\n~~~',
  },
}

export const AllVariants: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', maxWidth: '600px' }}>
      <AiMessageBubble role="user" content="What is the weather like today?" />
      <AiMessageBubble role="assistant" content="The weather is currently sunny with a temperature of 22°C." />
      <AiMessageBubble role="assistant" content="Here is some **bold text** and a [link](https://example.com)." />
      <AiMessageBubble role="assistant" content="" generating />
      <AiMessageBubble role="assistant" content="" generating stalled />
      <AiMessageBubble role="assistant" content="Here's your email summary:..." generating />
      <AiMessageBubble role="assistant" content="Sure! Here's a draft for Thomas:..." generating stalled />
    </div>
  ),
}
