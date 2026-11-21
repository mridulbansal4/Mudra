import { css, html, nothing } from "lit";
import { MudraCardBase, inr } from "./base";

const LANG: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "mr-IN": "Marathi",
  "ta-IN": "Tamil",
};

/**
 * <nc-bilingual-bubble> - messageType `x-mudra-bilingual-bubble`.
 * data: { senderName, sourceLocale, targetLocale, rawText, translatedText, terms, streaming, mine, piiRedacted }
 */
export class MudraBilingualBubble extends MudraCardBase {
  static styles = [
    MudraCardBase.baseStyles,
    css`
      .bubble {
        max-width: 92%;
        border-radius: 12px;
        padding: 10px 14px;
        background: var(--surface-1, #fcfbf9);
        border: 1px solid var(--border-hairline, rgba(28, 30, 38, 0.1));
      }
      :host([data-mine]) .wrap {
        display: flex;
        justify-content: flex-end;
      }
      :host([data-mine]) .bubble {
        background: color-mix(in oklch, var(--accent, #c84b20) 7%, var(--surface-1, #fcfbf9));
      }
      .src {
        color: var(--foreground-secondary, #464955);
        font-size: 13px;
        line-height: 1.65;
      }
      .tr {
        font-size: 15px;
        line-height: 1.65;
        margin-top: 4px;
      }
      .meta {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 4px;
      }
      .terms {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .cursor {
        display: inline-block;
        width: 7px;
        height: 1em;
        vertical-align: text-bottom;
        background: var(--foreground-muted, #6b6e7a);
        margin-left: 2px;
        animation: blink 1s steps(2) infinite;
      }
      @keyframes blink {
        50% {
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .cursor {
          animation: none;
        }
      }
    `,
  ];

  updated() {
    this.toggleAttribute("data-mine", Boolean(this.payload.mine));
  }

  render() {
    const p = this.payload;
    const terms = p.terms ?? p.extracted_terms ?? {};
    const pair = `${LANG[p.sourceLocale] ?? p.sourceLocale ?? "?"} to ${LANG[p.targetLocale] ?? p.targetLocale ?? "?"}`;
    return html`
      <div class="wrap">
        <div class="bubble" role="article" aria-label="Translated message from ${p.senderName ?? "participant"}">
          <div class="meta">
            <span class="title" style="font-size:13px">${p.senderName ?? "Participant"}</span>
            <span class="muted">${pair}</span>
            ${p.piiRedacted ? html`<span class="tag frozen">PII redacted ${p.piiRedacted}</span>` : nothing}
          </div>
          <div class="src" lang=${p.sourceLocale ?? "en-IN"}>${p.rawText}</div>
          ${p.translatedText || p.streaming
            ? html`<div class="tr" lang=${p.targetLocale ?? "en-IN"}>
                ${p.translatedText ?? ""}${p.streaming ? html`<span class="cursor" aria-hidden="true"></span>` : nothing}
              </div>`
            : nothing}
          ${terms.offered_amount_paise || terms.required_rpm || terms.warranty_months
            ? html`<div class="terms" aria-label="Extracted deal terms">
                ${terms.offered_amount_paise ? html`<span class="tag mono">Price ${inr(terms.offered_amount_paise)}</span>` : nothing}
                ${terms.required_rpm ? html`<span class="tag mono">${Number(terms.required_rpm).toLocaleString("en-IN")} RPM</span>` : nothing}
                ${terms.warranty_months ? html`<span class="tag mono">Warranty ${terms.warranty_months} mo</span>` : nothing}
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }
}
