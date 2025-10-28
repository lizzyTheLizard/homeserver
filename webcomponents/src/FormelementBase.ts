import { LitElement, TemplateResult, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import { Colors, Spacing, border } from './defaults'

export abstract class FormelementBase<T extends { toString: () => string }> extends LitElement {
  protected static readonly containterStyles = css`
    :host {
      display: block;
    }

    div {
      position: relative;
      height: 100%;
    }
  `

  protected static readonly formElementStyles = css`
    .formElement {
      display: block;
      font-family: sans-serif;
      padding-left: ${Spacing.SmallGap};
      padding-top: ${Spacing.Gap};
      padding-bottom: ${Spacing.SmallGap};
      padding-right: ${Spacing.SmallGap};
      border-radius: ${Spacing.BorderRadius};
      border: ${border(Colors.Default.Border)};
      width: 100%;
      box-sizing: border-box;
      height: 100%;
    }

    .formElement:focus {
      background-color: ${Colors.Primary.Transparent};
      color: ${Colors.Default.Text};
    }

    .formElement:invalid {
      background-color: ${Colors.Danger.Transparent};
      color: ${Colors.Default.Text};
    }

    .formElement.noLabel {
      padding-top: calc((${Spacing.Gap} + ${Spacing.SmallGap}) / 2);
      padding-bottom: calc((${Spacing.Gap} + ${Spacing.SmallGap}) / 2);
    }
    .disabled {
      background-color: ${Colors.Disabled.Transparent};
      color: ${Colors.Default.Text};
      cursor: not-allowed;
    }
  `

  protected static readonly labelStyles = css`
    label {
      color: ${Colors.Default.TransparentText};
      position: absolute;
      left: ${Spacing.SmallGap};
      top: ${Spacing.VerySmallGap};
      font-size: x-small;
    }

    .formElement:placeholder-shown + label {
      top: ${Spacing.SmallGap};
      font-size: small;
    }

    .formElement:focus + label {
      top: ${Spacing.VerySmallGap};
      font-size: x-small;
    }
  `

  protected static readonly formAssociated = true
  protected internals: ElementInternals

  constructor() {
    super()
    this.internals = this.attachInternals()
  }

  @property()
  public name: string = 'id_' + Math.random().toString()

  @property()
  public label: string | undefined = undefined

  @property({ type: Boolean })
  public disabled = false

  @property({ type: Boolean })
  public required = false

  @property({ attribute: false })
  public validator: ((value?: T) => { flags?: ValidityStateFlags, message?: string }) | undefined

  @property({ type: Boolean })
  public changeOnKeyup = false

  public override focus(options?: FocusOptions): void {
    const target = this.shadowRoot?.querySelector('.formElement') as HTMLFormElement | undefined
    if (!target)
      setTimeout(() => {
        const target2 = this.shadowRoot?.querySelector('.formElement') as HTMLFormElement | undefined
        if (!target2) throw new Error('No form element found in shadow root')
        target2.focus(options)
      }, 100)
    else target.focus(options)
  }

  override render() {
    // This must be done just after rendering to ensure the element alreay exists
    setTimeout(() => {
      const target = this.shadowRoot?.querySelector('.formElement') as HTMLFormElement | undefined
      if (!target) throw new Error('No form element found in shadow root')
      const value = this.getValue(target)
      this.updateValidity(value)
    }, 0)
    return html`
      <div>
        ${this.renderInputFieldOnly()} ${this.label ? html`<label for="${this.name}">${this.label}</label>` : ''}
      </div>
    `
  }

  protected abstract renderInputFieldOnly(): TemplateResult

  protected onKeyup() {
    this.onChange(!this.changeOnKeyup)
  }

  protected onChange(noChangeEvent?: boolean) {
    const target = this.shadowRoot?.querySelector('.formElement') as HTMLFormElement | undefined
    if (!target) throw new Error('No form element found in shadow root')
    const value = this.getValue(target)
    this.setValue(value)
    this.updateValidity(value)
    const options: CustomEventInit = {
      detail: { value: value },
      bubbles: true,
      composed: true,
    }
    if (!noChangeEvent) this.dispatchEvent(new CustomEvent('change', options))
  }

  protected updateValidity(value: T | undefined) {
    const target = this.shadowRoot?.querySelector('.formElement') as HTMLFormElement | undefined
    if (!target) throw new Error('No form element found in shadow root')
    const formValue = this.getFormValue(target)
    this.internals.setFormValue(formValue)

    if (!this.required && !this.validator) {
      this.setValidity(target)
      return false
    }
    if (this.required && value === undefined) {
      this.setValidity(target, { valueMissing: true }, 'Field is required')
      return false
    }
    if (this.validator) {
      const validationResult = this.validator(value ?? undefined)
      this.setValidity(target, validationResult.flags, validationResult.message)
      return false
    }
    this.setValidity(target)
    return false
  }

  protected getFormValue(target: HTMLFormElement): File | string | FormData | null {
    return this.getValue(target)?.toString() ?? null
  }

  protected getValue(target: HTMLFormElement): T | undefined {
    if (target.value === undefined) return undefined
    const value = target.value as T
    if (value.toString().length === 0) return undefined
    return value
  }

  protected abstract setValue(value: T | undefined): void

  private setValidity(target: HTMLFormElement, flags?: ValidityStateFlags, message?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    target.setCustomValidity(message ?? '')
    this.internals.setValidity(flags, message, target)
  }

  public getSelection(): TextSelection {
    const inputElement = this.shadowRoot?.querySelector('.formElement') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | undefined
    if (!inputElement) {
      console.warn('No input element found in shadow root')
      return { start: undefined, end: undefined }
    }
    if (typeof inputElement.selectionStart === 'undefined' || typeof inputElement.selectionEnd === 'undefined') {
      console.warn('Selection properties are not supported on this element')
      return { start: undefined, end: undefined }
    }
    if (inputElement.selectionStart === inputElement.selectionEnd) {
      return { start: undefined, end: undefined }
    }
    return {
      start: inputElement.selectionStart ?? undefined,
      end: inputElement.selectionEnd ?? undefined,
    }
  }
}

export interface TextSelection {
  start?: number
  end?: number
}
