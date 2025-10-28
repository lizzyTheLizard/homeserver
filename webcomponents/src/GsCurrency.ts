import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Colors} from './defaults';

@customElement('gs-currency')
export class GsCurrency extends LitElement {
  static override styles = css`
    .negative {
      color: ${Colors.Danger.Background};
    }
  `;

  @property({type: String})
  currency = 'CHF';

  override render() {
    let data = Number(this.textContent?.trim());
    if (!data) data = 0;
    const text = data.toLocaleString(undefined, {style: 'currency', currency: this.currency});
    if (data < 0) {
      return html`<span class="negative">${text}</span>`;
    }
    return html`<span>${text}</span>`;
  }
}
