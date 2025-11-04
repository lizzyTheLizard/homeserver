import { classMap } from 'lit/directives/class-map.js'
import { unsafeStatic, html } from 'lit/static-html.js'
import { customElement, property } from 'lit/decorators.js'
import { FormelementBase } from './FormelementBase'
import { TemplateResult, css } from 'lit'
import { Spacing } from './defaults'

@customElement('gs-select')
export class GsSelect extends FormelementBase<string> {
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
  public emptyLabel = 'No Value Selected'

  @property()
  public emptyValue = 'empty_' + Math.random().toString()

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
    const nodes: HTMLOptionElement[] = []
    for (const node of this.children) {
      if (!('tagName' in node)) continue
      if (node.tagName !== 'OPTION') continue
      nodes.push(node as HTMLOptionElement)
    }
    return html`
      <select
        id="${this.name}"
        name="${this.name}"
        ?disabled="${this.disabled}"
      @change=${(e: Event) => { this.handleChange(e) }}
        class="${classMap(classes)}"
      >
        ${this.required
          ? html`<option value="${this.emptyValue}" .selected="${!this.value}" style="display: none;">
              ${this.emptyLabel}
            </option>`
          : html`<option value="${this.emptyValue}" .selected="${!this.value}">${this.emptyLabel}</option>`}
        ${nodes.map(
          node =>
            html`<option value="${node.value}" .disabled="${node.disabled}" .selected="${node.value == this.value}">
              ${unsafeStatic(node.innerHTML)}
            </option>`,
        )};
      </select>
    `
  }

  protected override getValue(target: HTMLFormElement): string | undefined {
    if (target.value === this.emptyValue) {
      return undefined
    }
    return super.getValue(target)
  }
}
