import { TemplateResult, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { FormelementBase } from './FormelementBase'

@customElement('gs-textarea')
export class GsTextarea extends FormelementBase<string> {
  static override styles = [
    FormelementBase.containterStyles,
    FormelementBase.formElementStyles,
    FormelementBase.labelStyles,
  ]

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
    return html`<textarea
      name="${this.name}"
      id="${this.name}"
      ?disabled="${this.disabled}"
      placeholder=" "
      @keyup=${(e: Event) => { this.handleKeyUp(e) }}
      @change=${(e: Event) => { this.handleChange(e) }}
      class="${classMap(classes)}"
      .value="${this.value ?? ''}"
    ></textarea>`
  }
}
