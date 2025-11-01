import { html } from 'lit/static-html.js'
import { customElement } from 'lit/decorators.js'
import { LitElement } from 'lit'

@customElement('gs-date')
export class GsDate extends LitElement {
  override render() {
    const date = this.textContent.trim()
    if (!date) {
      // If the first child does not have text content, return empty
      return html``
    }
    if (date.length < 20) {
      // If the date is too short, we assume its wihtout time
      return html`${new Date(date).toLocaleDateString()}`
    }
    // Otherwise, we assume its with time and we return the full date with time
    return html`${new Date(date).toLocaleString()}`
  }
}
