import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Colors, Spacing } from './defaults'
import { classMap } from 'lit/directives/class-map.js'

@customElement('gs-header-link')
export class GsHeaderLink extends LitElement {
  static override styles = css`
    a {
      display: flex;
      align-items: center;
      background-color: ${Colors.Primary.Background};
      color: ${Colors.Primary.Text};
      height: 4rem;
      padding: 0 ${Spacing.Gap};
      box-sizing: border-box;
      text-decoration: none;
      color: ${Colors.Primary.Text};
    }

    a:hover {
      background-color: ${Colors.Primary.Hover};
    }

    a.active span {
      border-bottom: 0.2rem solid ${Colors.Primary.Text};
      padding-top: 0.4rem;
      padding-bottom: 0.2rem;
    }
  `

  @property()
  public href = ''

  override render() {
    const classes = {
      active: this.href === document.location.pathname,
    }
    return html`
      <a href=${this.href} class="${classMap(classes)}"
        ><div>
          <span><slot></slot></span></div
      ></a>
    `
  }
}
