import { TemplateResult, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { property } from 'lit/decorators.js'
import { FormelementBase } from './FormelementBase.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { Spacing } from './defaults.js'

@customElement('gs-number-input')
export class GsNumberInput extends FormelementBase<number> {
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

  @property({ type: Number })
  public min: number | undefined = undefined

  @property({ type: Number })
  public max: number | undefined = undefined

  @property({ type: Number })
  public step = 0.01

  @property({ type: Number })
  public value: number | undefined = undefined

  protected override setValue(value: number | undefined): void {
    this.value = value
  }

  protected override renderInputFieldOnly(): TemplateResult {
    const classes = {
      formElement: true,
      disabled: this.disabled,
      noLabel: !this.label,
    }
    return html`<input
      type="number"
      id="${this.name}"
      name="${this.name}"
      ?disabled="${this.disabled}"
      placeholder=" "
      .value="${this.value?.toString() ?? ''}"
      step="${ifDefined(this.step)}"
      min="${ifDefined(this.min)}"
      max="${ifDefined(this.max)}"
      @keyup=${() => { this.onKeyup() }}
      @change=${() => { this.onChange() }}
      class="${classMap(classes)}"
    />`
  }
}
