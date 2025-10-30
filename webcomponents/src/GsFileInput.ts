import { TemplateResult, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { FormelementBase } from './FormelementBase'
import { Spacing, Colors } from './defaults'

@customElement('gs-file-input')
export class GsFileInput extends FormelementBase<File> {
  static override styles = [
    FormelementBase.containterStyles,
    FormelementBase.formElementStyles,
    FormelementBase.labelStyles,
    css`
      .formElement {
        height: ${Spacing.InputHeight};
      }

      .formElement::file-selector-button {
        display: none;
      }

      .formElement:hover {
        background-color: ${Colors.Primary.Light};
      }

      .formElement:invalid:hover {
        background-color: ${Colors.Danger.Light};
      }
    `,
  ]

  #value: File | undefined = undefined

  public get value(): File | undefined {
    return this.#value
  }

  protected override renderInputFieldOnly(): TemplateResult {
    const classes = {
      formElement: true,
      disabled: this.disabled,
      noLabel: !this.label,
    }
    return html`<input
      type="file"
      name="${this.name}"
      id="${this.name}"
      ?disabled="${this.disabled}"
      @change=${() => { this.onChange() }}
      class="${classMap(classes)}"
    />`
  }

  protected override getFormValue(target: HTMLFormElement): string | File | FormData | null {
    return this.getValue(target) ?? null
  }

  protected override getValue(target: HTMLFormElement): File | undefined {
    const files = (target.files ?? []) as FileList
    if (files.length === 0) {
      return undefined
    }
    return files[0]
  }

  protected override setValue(value: File | undefined): void {
    this.#value = value
  }
}
