import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {html} from 'lit';

import './GsButton';
import './GsInput';
import './GsLoadingSpinner';

const meta: Meta = {
  title: "GsButton",
  argTypes: {
    type:{ control: 'select', options: ['primary', 'secondary', 'danger']},
    disabled: { control: 'boolean'},
    label: { control: 'text', defaultValue: 'Click Me' },
  },
  args: {
    type: 'primary',
    disabled: false,
    label: 'Click Me',
  },
} 
export default meta;
 
export const Normal: StoryObj = {
  render: args => html`
    <gs-button type=${args.type} ?disabled=${args.disabled} onclick="alert('Button clicked!')">
      ${args.label}
    </gs-button>
  `,
};

export const Link: StoryObj = {
  args: {
    href: 'https://example.com',
  },
  render: args => html`
    <gs-button href=${args.href} type=${args.type} ?disabled=${args.disabled}>
      ${args.label}
    </gs-button>
  `,
};


export const Form: StoryObj = {
  parameters: {
    submit: true,
  },
  args: {
    label: 'Submit',
  },
  render: args => html`
    <form id="testForm" method="POST" action="https://httpbin.org/post">
      <gs-input label="Name" name="name" required></gs-input>
      <div class="row buttons">
        <gs-button type=${args.type} submit="true">
          ${args.label}
        </gs-button>
      </div>
    </form>
  `,
};