import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsSelect'

interface Args {
  name: string | undefined
  label: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  validator: ((value?: string) => { flags?: ValidityStateFlags, message?: string }) | undefined
  changeOnKeyup: boolean | undefined
  emptyLabel: string | undefined
  emptyValue: string | undefined
  value: string | undefined
}

/**
 * A select component allowing users to choose from a list of options.
 */
const meta: Meta<Args> = {
  title: 'GsSelect',
  argTypes: {
    name: { control: 'text', description: 'The name of the input in a form: If none given a random name will be generated' },
    label: { control: 'text', description: 'The label for the input' },
    disabled: { control: 'boolean', description: 'Whether the input is disabled' },
    required: { control: 'boolean', description: 'Whether the input is required' },
    validator: { control: 'object', description: 'A custom  validator function for the input' },
    changeOnKeyup: { control: 'boolean', description: 'Whether to trigger change events on keyup' },
    emptyLabel: { control: 'text', description: 'The label for the empty option' },
    emptyValue: { control: 'text', description: 'The value for the empty option. If not defined a random value will be generated' },
    value: { control: 'object', description: 'An initial value' },
  },
  args: {
    label: 'Select Input',
    emptyLabel: 'No Value Selected',
  },
  render: (args: Args) => html`
    <gs-select
      name="${ifDefined(args.name)}"
      .value="${args.value}"
      label="${ifDefined(args.label)}"
      ?disabled="${args.disabled}"
      ?required="${args.required}"
      .validator="${args.validator}"
      ?changeOnKeyup="${args.changeOnKeyup}"
      emptyLabel="${ifDefined(args.emptyLabel)}"
      emptyValue="${ifDefined(args.emptyValue)}"
    >
      <option value="Option 1">Option 1</option>
      <option value="Option 2">Option 2</option>
      <option value="Option 3">Option 3</option>
    </gs-select>
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

export const Preselected: StoryObj<Args> = {
  args: {
    required: true,
    value: 'Option 2',
  },
}

export const PreselectedOptional: StoryObj<Args> = {
  args: {
    required: false,
    value: 'Option 2',
  },
}

export const NoEmptyLabel: StoryObj<Args> = {
  args: {
    emptyLabel: undefined,
  },
}
