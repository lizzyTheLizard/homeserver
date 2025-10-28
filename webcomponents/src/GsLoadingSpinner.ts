import {LitElement, html, css} from 'lit';
import {customElement} from 'lit/decorators.js';

@customElement('gs-loading-spinner')
export class GsLoadingSpinner extends LitElement {
  static override styles = css`
    #overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 200;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hidden {
      display: none !important;
    }

    .spinner {
      box-sizing: border-box;
      display: inline-block;
      position: relative;
      width: 80px;
      height: 80px;
    }

    .spinner div {
      box-sizing: border-box;
      position: absolute;
      border: 4px solid currentColor;
      opacity: 1;
      border-radius: 50%;
      animation: spinner 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    }

    .spinner div:nth-child(2) {
      animation-delay: -0.5s;
    }

    @keyframes spinner {
      0% {
        top: 36px;
        left: 36px;
        width: 8px;
        height: 8px;
        opacity: 0;
      }
      4.9% {
        top: 36px;
        left: 36px;
        width: 8px;
        height: 8px;
        opacity: 0;
      }
      5% {
        top: 36px;
        left: 36px;
        width: 8px;
        height: 8px;
        opacity: 1;
      }
      100% {
        top: 0;
        left: 0;
        width: 80px;
        height: 80px;
        opacity: 0;
      }
    }
  `;

  public show() {
    this.shadowRoot?.getElementById('overlay')?.classList.remove('hidden');
  }

  public close() {
    this.shadowRoot?.getElementById('overlay')?.classList.add('hidden');
  }

  override render() {
    return html`
      <div id="overlay" class="hidden">
        <div class="spinner">
          <div></div>
          <div></div>
        </div>
      </div>
    `;
  }
}
