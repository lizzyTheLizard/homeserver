import {LitElement, html, css} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {Colors, Spacing, border} from './defaults';

declare global {
  interface Window {
    showMessage: typeof showMessage;
  }
}

export type MessageType = 'danger' | 'info' | 'success';

export let showMessage: (type: MessageType, message: string, timeToShow: number) => void = () => {
  console.warn('No GsInfo registered');
};

@customElement('gs-info')
export class GsInfo extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      z-index: 300;
    }
    .container {
      border-radius: ${Spacing.BorderRadius};
      border: ${border(Colors.Default.Border)};
      display: flex;
      align-items: center;
      margin-top: ${Spacing.SmallGap}
    }

    gs-icon {
      min-height: ${Spacing.Gap};
      min-width: ${Spacing.Gap};
      padding: ${Spacing.SmallGap};
    }

    .content {
      padding: ${Spacing.SmallGap};
      flex-grow: 1;
    }

    .danger {
      background-color: ${Colors.Danger.Background};
      border: ${border(Colors.Danger.Border)};
      color: ${Colors.Danger.Text};
    }

    .info {
      background-color: ${Colors.Primary.Background};
      border: ${border(Colors.Primary.Border)};
      color: ${Colors.Primary.Text};
    }

    .success {
      background-color: ${Colors.Success.Background};
      border: ${border(Colors.Success.Border)};
      color: ${Colors.Success.Text};
    }

    
    @media (min-width: ${Spacing.MobileBreakpoint}) {
      :host {
        left: 25%;
        width: 50%;
        bottom: ${Spacing.Gap};
      }
    }

    @media (max-width: ${Spacing.MobileBreakpoint}) {
      :host {
        width: calc(100% - ${Spacing.Gap} - ${Spacing.Gap});
        left: ${Spacing.Gap};
        bottom: ${Spacing.Gap};
    }
  `;

  constructor() {
    super();
    this.messages = JSON.parse(localStorage.getItem('gs-info') ?? '[]') as Message[];
    showMessage = (t, m, s) => this.show(t, m, s);
    window.showMessage = showMessage;
  }

  public show(type: MessageType, message: string, timeToShow: number) {
    const newMessage: Message = {type: type, message: message, untill: Date.now() + timeToShow};
    this.messages = [...this.messages, newMessage];
  }

  @state()
  private messages: Message[] = [];

  override render() {
    const now = Date.now();
    const messages = this.messages.filter((m) => m.untill > now + 10);
    localStorage.setItem('gs-info', JSON.stringify(messages));
    const nextUpdate = Math.min(...messages.map((m) => m.untill));
    setTimeout(() => this.requestUpdate(), nextUpdate - now);
    return html`
      ${messages.map(
        (m) => html`
          <div class="container ${m.type}">
            <gs-icon name="${m.type}"></gs-icon>
            <div class="content">${m.message}</div>
          </div>
        `
      )}
    `;
  }
}

interface Message {
  type: MessageType;
  message: string;
  untill: number;
}
