import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsInput'

interface Args {
  name: string | undefined
  label: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  validator: ((value?: string) => { flags?: ValidityStateFlags, message?: string }) | undefined
  changeOnKeyup: boolean | undefined
  type: 'text' | 'url' | 'email' | 'password' | 'date'
  value: string | undefined
}

/**
 * A text input component allowing users to enter single-line text.
 */
const meta: Meta<Args> = {
  title: 'GsInput',
  argTypes: {
    name: { control: 'text', description: 'The name of the input in a form: If none given a random name will be generated' },
    label: { control: 'text', description: 'The label for the input' },
    disabled: { control: 'boolean', description: 'Whether the input is disabled' },
    required: { control: 'boolean', description: 'Whether the input is required' },
    validator: { control: 'object', description: 'A custom  validator function for the input' },
    changeOnKeyup: { control: 'boolean', description: 'Whether to trigger change events on keyup' },
    type: { control: 'select', options: ['text', 'url', 'email', 'password', 'date'], description: 'The type of the input' },
    value: { control: 'text', description: 'An initial value' },
  },
  args: {
    type: 'text',
    label: 'Text Input',
  },
  render: (args: Args) => html`
    <gs-input
      name="${ifDefined(args.name)}"
      value="${ifDefined(args.value)}"
      label="${ifDefined(args.label)}"
      ?disabled="${args.disabled}"
      ?required="${args.required}"
      .validator="${args.validator}"
      ?changeOnKeyup="${args.changeOnKeyup}"
      type="${args.type}"
    ></gs-input>
  `,
}

export default meta

export const Normal: StoryObj<Args> = {
}

export const Disabled: StoryObj<Args> = {
  args: {
    disabled: true,
  },
}

export const Required: StoryObj<Args> = {
  args: {
    required: true,
  },
}

export const Filled: StoryObj<Args> = {
  args: {
    required: true,
    value: 'Filled input value',
  },
}

export const URL: StoryObj<Args> = {
  args: {
    type: 'url',
    value: 'https://example.com',
  },
}

export const Email: StoryObj<Args> = {
  args: {
    type: 'email',
    value: 'user@example.com',
  },
}

export const Password: StoryObj<Args> = {
  args: {
    type: 'password',
    value: 'secret-password',
  },
}

export const Date: StoryObj<Args> = {
  args: {
    type: 'date',
    value: '2024-01-01',
  },
}
