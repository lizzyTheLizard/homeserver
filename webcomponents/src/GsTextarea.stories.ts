import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsTextarea'

interface Args {
  name: string | undefined
  label: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  validator: ((value?: string) => { flags?: ValidityStateFlags, message?: string }) | undefined
  changeOnKeyup: boolean | undefined
  value: string | undefined
}

/**
 * A text area component allowing users to enter multi-line text.
 */
const meta: Meta<Args> = {
  title: 'GsTextarea',
  argTypes: {
    name: { control: 'text', description: 'The name of the input in a form: If none given a random name will be generated' },
    label: { control: 'text', description: 'The label for the input' },
    disabled: { control: 'boolean', description: 'Whether the input is disabled' },
    required: { control: 'boolean', description: 'Whether the input is required' },
    validator: { control: 'object', description: 'A custom  validator function for the input' },
    changeOnKeyup: { control: 'boolean', description: 'Whether to trigger change events on keyup' },
    value: { control: 'object', description: 'An initial value' },
  },
  args: {
    label: 'Text Input',
  },
  render: (args: Args) => html`
    <gs-textarea
      name="${ifDefined(args.name)}"
      value="${ifDefined(args.value)}"
      label="${ifDefined(args.label)}"
      ?disabled="${args.disabled}"
      ?required="${args.required}"
      .validator="${args.validator}"
      ?changeOnKeyup="${args.changeOnKeyup}"
    ></gs-textarea>
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
