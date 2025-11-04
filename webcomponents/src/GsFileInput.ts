import { TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
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

  @property({ attribute: false })
  public value: File | undefined = undefined

  protected override setValue(value: File | undefined): void {
    this.value = value
  }

  protected override renderInputFieldOnly(): TemplateResult {
    const classes = {
      formElement: true,
      disabled: this.disabled,
      noLabel: !this.label,
    }
    // Create a DataTransfer object and add the file
    const dataTransfer = new DataTransfer()
    if (this.value) {
      dataTransfer.items.add(this.value)
    }
    return html`<input
      type="file"
      name="${this.name}"
      id="${this.name}"
      ?disabled="${this.disabled}"
      @change=${(e: Event) => { this.handleChange(e) }}
      class="${classMap(classes)}"
      .files=${dataTransfer.files}
    />`
  }

  protected override getFormValue(): string | File | FormData | null {
    return this.value ?? null
  }

  protected override getValue(target: HTMLFormElement): File | undefined {
    const files = (target.files ?? []) as FileList
    if (files.length === 0) {
      return undefined
    }
    return files[0]
  }
}
