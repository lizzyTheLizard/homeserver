import { TemplateResult, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { property } from 'lit/decorators.js'
import { FormelementBase } from './FormelementBase'
import { Spacing } from './defaults'

@customElement('gs-input')
export class GsInput extends FormelementBase<string> {
  static override styles = [
    FormelementBase.containterStyles,
    FormelementBase.formElementStyles,
    FormelementBase.labelStyles,
    css`
      .formElement {
        height: ${Spacing.InputHeight};
      }
    `,
  ]

  @property()
  public type: 'text' | 'url' | 'email' | 'password' | 'date' = 'text'

  @property()
  public value: string | undefined = undefined

  protected override setValue(value: string | undefined): void {
    this.value = value
  }

  protected override renderInputFieldOnly(): TemplateResult {
    const classes = {
      formElement: true,
      disabled: this.disabled,
      noLabel: !this.label,
    }
    const input = html`<input
      type="${this.type}"
      id="${this.name}"
      name="${this.name}"
      ?disabled="${this.disabled}"
      placeholder=" "
      .value="${this.value ?? ''}"
      @keyup=${(e: Event) => { this.handleKeyUp(e) }}
      @change=${(e: Event) => { this.handleChange(e) }}
      class="${classMap(classes)}"
      list="list"
    />`
    const nodes: HTMLOptionElement[] = []
    for (const node of this.children) {
      if (!('tagName' in node)) continue
      if (node.tagName !== 'OPTION') continue
      nodes.push(node as HTMLOptionElement)
    }
    const datalist = nodes.length > 0
      ? html`<datalist id="list">
            ${nodes.map(
              node => html`
                <option value="${node.value}" ?disabled="${node.disabled}" ?selected="${node.defaultSelected}">
                  ${node.textContent}
                </option>
              `,
            )}
          </datalist>`
      : ''
    return html`${input}${datalist}`
  }
}
