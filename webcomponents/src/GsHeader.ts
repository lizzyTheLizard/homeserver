import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Colors, Spacing } from './defaults'
import { unsafeCSS } from 'lit'
import './GsHeaderLink'

const headerHeight = unsafeCSS('2rem')
const headerFontSize = unsafeCSS('1.5rem')

@customElement('gs-header')
export class GsHeader extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-wrap: wrap;
      flex-wrap: wrap;
      width: 100%;
      background-color: ${Colors.Primary.Background};
      color: ${Colors.Primary.Text};
      align-items: center;
      height: calc(${headerHeight} + ${Spacing.Gap} + ${Spacing.Gap});
      z-index: 10;
    }

    @media print {
      :host {
        display: none !important;
      }
    }

    gs-icon {
      padding-left: ${Spacing.Gap};
      padding-right: 0;
      padding-top: ${Spacing.Gap};
      padding-bottom: ${Spacing.Gap};
      height: ${headerHeight};
      width: ${headerHeight};
    }

    #spacer {
      flex-grow: 1;
    }

    #applicationName {
      font-size: ${headerFontSize};
      padding-left: ${Spacing.Gap};
      padding-right: ${Spacing.Gap};
    }

    @media (min-width: ${Spacing.MobileBreakpoint}) {
      gs-icon {
        display: none;
      }

      slot {
        display: flex;
        flex-direction: row;
      }
    }

    @media (max-width: ${Spacing.MobileBreakpoint}) {
      slot {
        display: flex;
        flex-direction: column;
        width: 100%;
        background-color: ${Colors.Primary.Background};
      }

      .mobileHidden {
        display: none;
      }

      #logoutLink,
      #portalLink {
        width: 100%;
      }
    }
  `

  #showMenu = false

  @property()
  public applicationName = ''

  @property()
  public user = ''

  @property({ type: Boolean })
  public portalAccess = false

  override render() {
    return html`
      <gs-icon
        @click="${() => { this.toggle() }}"
        name="menu"
      ></gs-icon>
      <span id="applicationName">${this.applicationName ? this.applicationName : 'Homeserver'}</span>
      <slot id="list" class="mobileHidden"></slot>
      <div id="spacer"></div>
      ${this.portalAccess
        ? html`<gs-header-link id="portalLink" class="mobileHidden" href="/">All Application</gs-header-link>`
        : ''}
      <gs-header-link id="logoutLink" class="mobileHidden" href="/logout">Logout ${this.user}</gs-header-link>
    `
  }

  private toggle() {
    this.#showMenu = !this.#showMenu
    const list = this.shadowRoot?.getElementById('list')
    if (!list) {
      throw new Error('List element not found')
    }
    list.className = this.#showMenu ? '' : 'mobileHidden'
    const logoutLink = this.shadowRoot?.getElementById('logoutLink')
    if (!logoutLink) {
      throw new Error('LogoutLink element not found')
    }
    logoutLink.className = this.#showMenu ? '' : 'mobileHidden'
    const portalLink = this.shadowRoot?.getElementById('portalLink')
    if (portalLink) {
      portalLink.className = this.#showMenu ? '' : 'mobileHidden'
    }
  }
}
