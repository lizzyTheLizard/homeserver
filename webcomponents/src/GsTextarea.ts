import { TemplateResult, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { FormelementBase } from './FormelementBase.js'

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
      @keyup=${() => { this.onKeyup() }}
      @change=${() => { this.onChange() }}
      class="${classMap(classes)}"
      .value="${this.value ?? ''}"
    ></textarea>`
  }
}
