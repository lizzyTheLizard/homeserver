import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Colors, Spacing, border } from './defaults'
import './GsIcon'

@customElement('gs-dialog')
export class GsDialog extends LitElement {
  static override styles = css`
    #overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hidden {
      display: none !important;
    }

    .dialog {
      width: 50rem;
      display: flex;
      flex-direction: column;
      z-index: 101;
      background-color: white;
      border-radius: ${Spacing.BorderRadius};
    }

    @media (max-width: ${Spacing.MobileBreakpoint}) {
      .dialog {
        width: calc(100% - ${Spacing.Gap} - ${Spacing.Gap});
        height: calc(100% - ${Spacing.Gap} - ${Spacing.Gap});
      }
    }

    #head {
      border-bottom: ${border(Colors.Default.Border)};
      display: flex;
      margin: 0;
      padding: ${Spacing.SmallGap} 0;
    }

    #head h2 {
      text-align: center;
      flex-grow: 1;
      margin: 0;
    }

    #head gs-icon {
      margin: 0 ${Spacing.SmallGap};
      height: 2rem;
      width: 2rem;
    }

    #body {
      padding: ${Spacing.Gap};
      flex-grow: 1;
    }

    #body ::slotted(*) {
      margin-top: ${Spacing.SmallGap};
    }

    #footer {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: stretch;
      margin-top: 1rem;
      justify-content: flex-end;
      border-top: ${border(Colors.Default.Border)};
      padding: ${Spacing.SmallGap};
    }

    #footer ::slotted(*) {
      margin-left: ${Spacing.SmallGap};
    }

    @media (max-width: ${Spacing.MobileBreakpoint}) {
      #footer ::slotted(*) {
        width: 100%;
        margin-left: 0;
        margin-top: ${Spacing.SmallGap};
      }
    }

    gs-icon {
      cursor: pointer;
    }
  `

  @property()
  public header: string | undefined

  public show() {
    this.shadowRoot?.getElementById('overlay')?.classList.remove('hidden')
  }

  public close() {
    this.shadowRoot?.getElementById('overlay')?.classList.add('hidden')
  }

  private closeButtonClick(e: Event) {
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('close'))
    this.close()
  }

  override render() {
    return html`
      <div id="overlay" class="hidden">
        <div class="dialog">
          <div id="head">
            <h2>${this.header}</h2>
            <gs-icon
              name="close"
              @click="${(e: Event) => { this.closeButtonClick(e) }}"
            ></gs-icon>
          </div>
          <div id="body">
            <slot></slot>
          </div>
          <div id="footer">
            <slot name="button"></slot>
          </div>
        </div>
      </div>
    `
  }
}
