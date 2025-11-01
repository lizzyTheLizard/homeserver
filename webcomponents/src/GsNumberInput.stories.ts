import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsNumberInput'

interface Args {
  name: string | undefined
  label: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  validator: ((value?: string) => { flags?: ValidityStateFlags, message?: string }) | undefined
  changeOnKeyup: boolean | undefined
  min: number | undefined
  max: number | undefined
  step: number | undefined
  value: number | undefined
}

/**
 * A number input component allowing users to enter numeric values.
 */
const meta: Meta<Args> = {
  title: 'GsNumberInput',
  argTypes: {
    name: { control: 'text', description: 'The name of the input in a form: If none given a random name will be generated' },
    label: { control: 'text', description: 'The label for the input' },
    disabled: { control: 'boolean', description: 'Whether the input is disabled' },
    required: { control: 'boolean', description: 'Whether the input is required' },
    validator: { control: 'object', description: 'A custom  validator function for the input' },
    changeOnKeyup: { control: 'boolean', description: 'Whether to trigger change events on keyup' },
    min: { control: 'number', description: 'The minimum value for number inputs' },
    max: { control: 'number', description: 'The maximum value for number inputs' },
    step: { control: 'number', description: 'The step value for number inputs' },
    value: { control: 'number', description: 'An initial value' },
  },
  args: {
    label: 'Number Input',
  },
  render: (args: Args) => html`
    <gs-number-input
      name="${ifDefined(args.name)}"
      value="${ifDefined(args.value)}"
      label="${ifDefined(args.label)}"
      ?disabled="${args.disabled}"
      ?required="${args.required}"
      .validator="${args.validator}"
      ?changeOnKeyup="${args.changeOnKeyup}"
      min="${ifDefined(args.min)}"
      max="${ifDefined(args.max)}"
      step="${ifDefined(args.step)}"
    ></gs-number-input>
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
    value: 17.5,
  },
}

export const Bounds: StoryObj<Args> = {
  args: {
    min: 0,
    max: 100,
  },
}

export const Step: StoryObj<Args> = {
  args: {
    step: 5,
  },
}
