import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

/**
 * A table with some default styles.
 */
const meta: Meta = {
  title: 'GsTable',
  render: () => html`
    <table class="data-table">
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
          <th>Column 3</th>
        </tr>
      </thead>
      <tbody>
        <tr class="empty-row">
          <td colspan="3" style="text-align: center">No Data</td>
        </tr>
        <tr>
          <td>LangeswortohneSpace</td>
          <td>Row 1</td>
          <td>WeitersLangesWort</td>
        </tr>
      </tbody>
    </table>
  `,
}

export default meta

export const Normal: StoryObj = {
}

export const Empty: StoryObj = {
  render: () => html`
    <table class="data-table">
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
          <th>Column 3</th>
        </tr>
      </thead>
      <tbody>
        <tr class="empty-row">
          <td colspan="3" style="text-align: center">No Data</td>
        </tr>
      </tbody>
    </table>
  `,
}
