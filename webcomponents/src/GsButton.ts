import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {Colors, Spacing, border} from './defaults';
import {GsLoadingSpinner} from './GsLoadingSpinner';

@customElement('gs-button')
export class GsButton extends LitElement {
  protected internals: ElementInternals;
  protected static readonly formAssociated = true;
  static override styles = css`
    :host {
      display: block;
    }

    .button {
      display: block;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      border-radius: ${Spacing.BorderRadius};
      width: 100%;
      box-sizing: border-box;
      height: ${Spacing.InputHeight};
      font-size: 0.9rem;
      padding: calc((${Spacing.InputHeight} - 0.9rem) / 2);
    }

    .primary {
      background-color: ${Colors.Primary.Background};
      color: ${Colors.Primary.Text};
      border: ${border(Colors.Primary.Border)};
    }

    .primary:focus,
    .primary:hover {
      background-color: ${Colors.Primary.Hover};
    }

    .secondary {
      background-color: ${Colors.Secondary.Background};
      color: ${Colors.Secondary.Text};
      border: ${border(Colors.Secondary.Border)};
    }

    .secondary:focus,
    .secondary:hover {
      background-color: ${Colors.Secondary.Hover};
    }

    .danger {
      background-color: ${Colors.Danger.Background};
      color: ${Colors.Danger.Text};
      border: ${border(Colors.Danger.Border)};
    }

    .danger:focus,
    .danger:hover {
      background-color: ${Colors.Danger.Hover};
    }

    .disabled {
      background-color: ${Colors.Disabled.Background};
      color: ${Colors.Disabled.Text};
      border: ${border(Colors.Disabled.Border)};
      cursor: not-allowed;
    }
  `;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  @property({type: Boolean})
  public disabled = false;

  @state()
  private formDisabled = false;

  @property({type: Boolean})
  public submit = false;

  @property()
  public href: string | undefined = undefined;

  @property()
  public type: 'primary' | 'secondary' | 'danger' = 'primary';

  @property()
  public name: string | undefined = undefined;

  override render() {
    // Just after the render, we need to check if the form is valid
    setTimeout(() => {
      this.internals.form?.addEventListener('change', () => this.updateFormDisabled());
      this.updateFormDisabled();
    }, 10);

    const disabled = this.disabled || this.formDisabled;
    const classes = {
      button: true,
      disabled: disabled,
      primary: !disabled && this.type === 'primary',
      secondary: !disabled && this.type === 'secondary',
      danger: !disabled && this.type === 'danger',
    };
    if (this.submit) {
      return html`
        <button type="button" @click="${this.buttonClick}" class="${classMap(classes)}">
          <slot></slot>
        </button>
        <gs-loading-spinner id="spinner"></gs-loading-spinner>
      `;
    }
    if (this.href) {
      return html`
        <a href=${this.href} class="${classMap(classes)}">
          <slot></slot>
        </a>
      `;
    }
    return html`
      <button type="button" @click="${this.buttonClick}" class="${classMap(classes)}">
        <slot></slot>
      </button>
    `;
  }

  private buttonClick(e: Event): boolean {
    if (this.disabled || this.formDisabled) {
      e.preventDefault();
      return false;
    }
    if (this.submit && this.internals.form) {
      (this.shadowRoot?.getElementById('spinner') as GsLoadingSpinner)?.show();
      e.preventDefault();
      this.internals.setFormValue('');
      this.internals.form.requestSubmit();
      return false;
    }
    return true;
  }

  public updateFormDisabled() {
    if (!this.submit) {
      return;
    }
    const form = this.internals.form;
    if (!form) {
      return;
    }
    this.formDisabled = !form.checkValidity();
  }
}
