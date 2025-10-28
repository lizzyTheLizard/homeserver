import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Colors, Spacing, border} from './defaults';

@customElement('gs-card')
export class GsCard extends LitElement {
  static override styles = css`
    :host {
      margin: ${Spacing.Gap};
      width: 15rem;
      max-width: calc(${Spacing.MobileBreakpoint} - 4 * ${Spacing.Gap});
      border: ${border(Colors.Default.BorderLight)};
      border-radius: ${Spacing.BorderRadius};
      text-align: center;
      padding: ${Spacing.Gap};
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    a {
      color: ${Colors.Default.Text};
      text-decoration: none;
      display: block;
    }

    .spacer {
      flex-grow: 1;
      margin: ${Spacing.SmallGap};
    }

    h3 {
      font-size: 1.5rem;
    }

    ::slotted(*) {
      margin: ${Spacing.VerySmallGap};
    }

    @media (max-width: ${Spacing.MobileBreakpoint}) {
      :host {
        width: calc(100% - ${Spacing.Gap} - ${Spacing.Gap});
        margin: ${Spacing.Gap} 0;
      }
    }

    @media print {
      :host {
        max-width: 100%;
        width: calc(49% - ${Spacing.Gap} - ${Spacing.Gap});
        margin: ${Spacing.Gap} 0;
        page-break-inside: avoid;
      }
    }
  `;

  @property()
  public header = '';

  @property()
  public href: string | undefined;

  override render() {
    if (this.href) {
      return html`
        <a href="${this.href}">
          <slot name="icon"></slot>
          <h3 class="card-title">${this.header}</h3>
          <slot></slot>
          <div class="spacer"></div>
          <slot name="footer"></slot>
        </a>
      `;
    } else {
      return html`
        <slot name="icon"></slot>
        <h3 class="card-title">${this.header}</h3>
        <slot></slot>
        <div class="spacer"></div>
        <slot name="footer"></slot>
      `;
    }
  }
}
