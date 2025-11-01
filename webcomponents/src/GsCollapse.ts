import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Colors, Spacing, border } from './defaults'
import './GsIcon'

@customElement('gs-collapse')
export class GsCollapse extends LitElement {
  static override styles = css`
    .box {
      display: block;
      width: calc(100% - 2 * ${Spacing.SmallGap});
      border-radius: ${Spacing.BorderRadius};
      border: ${border(Colors.Default.Border)};
      position: relative;
      padding: ${Spacing.SmallGap};
      cursor: pointer;
    }

    .content {
      cursor: initial;
    }

    .header {
      color: ${Colors.Default.TransparentText};
      display: flex;
    }

    .header {
      position: absolute;
      left: ${Spacing.SmallGap};
      padding-right: ${Spacing.SmallGap};
      top: -${Spacing.SmallGap};
      font-size: small;
      color: ${Colors.Default.TransparentText};
      background-color: ${Colors.Default.Background};
    }

    gs-icon {
      display: inline-block;
    }

    .content {
      width: 100%;
    }
  `

  @property({ type: String })
  public header = ''

  @property({ type: Boolean })
  public expanded = false

  override render() {
    const header = html`
      <span class="header">
        <gs-icon name="${!this.expanded ? 'caretRight' : 'caretDown'}"></gs-icon>
        ${this.header}
      </span>
    `
    if (!this.expanded) {
      return html`
        <div
          class="box"
          @click="${() => { this.toggleCollapse() }}"
        >
          ${header}
        </div>
      `
    }
    else {
      return html`
        <div
          class="box"
          @click="${() => { this.toggleCollapse() }}"
        >
          ${header}
          <div
            class="content"
              @click="${(e: MouseEvent) => { e.stopPropagation() }}"
          >
            <slot></slot>
          </div>
        </div>
      `
    }
  }

  private toggleCollapse() {
    this.expanded = !this.expanded
  }
}
