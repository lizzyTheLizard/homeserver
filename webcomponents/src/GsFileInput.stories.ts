import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsFileInput'

interface Args {
  name: string | undefined
  label: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  validator: ((value?: File) => { flags?: ValidityStateFlags, message?: string }) | undefined
  changeOnKeyup: boolean | undefined
  value: File | undefined
}

/**
 * A file input component allowing users to select files from their device.
 */
const meta: Meta<Args> = {
  title: 'GsFileInput',
  argTypes: {
    name: { control: 'text', description: 'The name of the file input in a form: If none given a random name will be generated' },
    label: { control: 'text', description: 'The label for the file input' },
    disabled: { control: 'boolean', description: 'Whether the file input is disabled' },
    required: { control: 'boolean', description: 'Whether the file input is required' },
    validator: { control: 'object', description: 'A custom  validator function for the file input' },
    changeOnKeyup: { control: 'boolean', description: 'Whether to trigger change events on keyup' },
    value: { control: 'object', description: 'A file to preselect in the file input' },
  },
  args: {
    disabled: false,
    required: false,
    changeOnKeyup: false,
    label: 'Upload File',
  },
  render: (args: Args) => html`
    <gs-file-input
      name="${ifDefined(args.name)}"
      .value="${args.value}"
      label="${ifDefined(args.label)}"
      ?disabled="${args.disabled}"
      ?required="${args.required}"
      .validator="${args.validator}"
      ?changeOnKeyup="${args.changeOnKeyup}"
    ></gs-file-input>
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
    value: new File(['file content'], 'example.txt', { type: 'text/plain' }),
  },
}
