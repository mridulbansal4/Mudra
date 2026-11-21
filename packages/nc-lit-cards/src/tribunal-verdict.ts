import { css, html, nothing } from "lit";
import { MudraCardBase, inr } from "./base";

/**
 * <nc-tribunal-verdict> - messageType `x-mudra-tribunal-verdict`.
 * data: { disputeId, amountPaise, buyerRefundBps, sellerPayoutBps, summary, rationale, hamming, freezeRemainingSec, resolved, canResolve }
 */
export class MudraTribunalVerdict extends MudraCardBase {
  static styles = [
    MudraCardBase.baseStyles,
    css`
      .card {
        border-color: color-mix(in oklch, var(--freeze-danger, #c23a2b) 30%, transparent);
      }
      .split {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 10px;
        margin-top: 12px;
      }
      .cell {
        border-radius: 8px;
        background: var(--surface-2, #f1efea);
        padding: 10px 12px;
      }
      .big {
        font-family: var(--font-mono, ui-monospace, monospace);
        font-variant-numeric: tabular-nums;
        font-size: 16px;
        font-weight: 600;
      }
      .summary {
        margin-top: 10px;
        color: var(--foreground-secondary, #464955);
      }
      .meter {
        height: 6px;
        border-radius: 3px;
        background: var(--vault-locked, #1f7a4d);
        margin-top: 10px;
        overflow: hidden;
      }
      .meter > i {
        display: block;
        height: 100%;
        background: var(--freeze-danger, #c23a2b);
      }
    `,
  ];

  render() {
    const p = this.payload;
    const buyerBps = Number(p.buyerRefundBps ?? 0);
    const sellerBps = Number(p.sellerPayoutBps ?? 10000 - buyerBps);
    const amount = Number(p.amountPaise ?? 0);
    return html`
      <div class="card" role="region" aria-label="AI tribunal verdict">
        <div class="row">
          <span class="title">AI tribunal recommendation</span>
          ${p.resolved
            ? html`<span class="tag ok">Executed</span>`
            : html`<span class="tag frozen mono">Frozen ${p.freezeRemainingSec ?? 90}s</span>`}
        </div>
        ${p.summary ? html`<div class="summary">${p.summary}</div>` : nothing}
        <div class="meter" aria-hidden="true"><i style="width:${buyerBps / 100}%"></i></div>
        <div class="split">
          <div class="cell">
            <div class="muted">Buyer refund</div>
            <div class="big">${(buyerBps / 100).toFixed(1)}%</div>
            <div class="mono muted">${inr((amount * buyerBps) / 10000)}</div>
          </div>
          <div class="cell">
            <div class="muted">Seller payout</div>
            <div class="big">${(sellerBps / 100).toFixed(1)}%</div>
            <div class="mono muted">${inr((amount * sellerBps) / 10000)}</div>
          </div>
        </div>
        ${p.hamming != null ? html`<div class="muted" style="margin-top:8px">pHash Hamming distance ${p.hamming} of 64 bits</div>` : nothing}
        ${p.rationale ? html`<div class="muted" style="margin-top:4px">${p.rationale}</div>` : nothing}
        ${p.canResolve && !p.resolved
          ? html`<div class="actions">
              <button class="primary" @click=${() => this.emit("RESOLVE_SPLIT", { buyerRefundBps: buyerBps, sellerPayoutBps: sellerBps })}>
                Execute binding split
              </button>
              <button @click=${() => this.emit("REFUND_BUYER")}>Full refund</button>
            </div>`
          : nothing}
      </div>
    `;
  }
}
