import type {Meta, StoryObj} from '@storybook/web-components-vite';
import {html} from 'lit';

import './GsCollapse';
import './GsIcon';

/**
 * A GsCollapse is a container element that can hold content and actions about a single subject.
 */
const meta: Meta = {
  title: 'GsCollapse',
  argTypes: {
    header: {control: 'text', description: 'The header text of the collapse component.'},
    content: {control: 'text', description: 'The content inside the collapse component.'},
  },
};
export default meta;

export const Normal: StoryObj = {
  args: {
    header: 'Header',
    content: 'This is the body of the collapse.',
  },
  render: (args) => html`
    <gs-collapse header="${args.header}">
      ${args.content}
    </gs-collapse>
  `,
};
