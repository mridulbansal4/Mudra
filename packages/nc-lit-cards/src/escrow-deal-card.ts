import { css, html, nothing } from "lit";
import { MudraCardBase, inr, shortHash } from "./base";

const STEPS = [
  { label: "Negotiate", states: ["CREATED"] },
  { label: "Escrow locked", states: ["FUNDED"] },
  { label: "Video assay", states: ["INSPECTION_LIVE", "ASSAY_VERIFIED"] },
  { label: "Settled", states: ["RELEASED", "DISPUTED_FROZEN", "ARBITRATED_SPLIT", "REFUNDED"] },
];

const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  CREATED: { text: "Awaiting escrow", cls: "" },
  FUNDED: { text: "Locked in vault", cls: "ok" },
  INSPECTION_LIVE: { text: "Live video assay", cls: "live" },
  ASSAY_VERIFIED: { text: "Assay verified", cls: "ok" },
  RELEASED: { text: "Funds released", cls: "ok" },
  DISPUTED_FROZEN: { text: "Frozen for arbitration", cls: "frozen" },
  ARBITRATED_SPLIT: { text: "Settled by split", cls: "ok" },
  REFUNDED: { text: "Refunded to buyer", cls: "" },
};

/**
 * <nc-escrow-deal-card> - messageType `x-mudra-escrow-card`.
 * data: { dealId, title, amountPaise, fsmState, version, voucher: { curr_voucher_sha256, ed25519_signature, voucher_type } }
 */
export class MudraEscrowCard extends MudraCardBase {
  static styles = [
    MudraCardBase.baseStyles,
    css`
      .steps {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        margin: 14px 0 4px;
      }
      .step {
        font-size: 11.5px;
        color: var(--foreground-muted, #6b6e7a);
      }
      .bar {
        height: 3px;
        border-radius: 2px;
        background: var(--surface-2, #ebe8e1);
        margin-bottom: 6px;
      }
      .step.done .bar {
        background: var(--vault-locked, #1f7a4d);
      }
      .step.current .bar {
        background: var(--accent, #c84b20);
      }
      .step.current {
        color: var(--foreground, #1b1c22);
        font-weight: 500;
      }
    `,
  ];

  render() {
    const p = this.payload;
    const state: string = p.fsmState ?? p.fsm_state ?? "CREATED";
    const current = STEPS.findIndex((s) => s.states.includes(state));
    const lbl = STATE_LABEL[state] ?? { text: state, cls: "" };
    const role = this.viewerRole ?? p.viewerRole ?? "buyer";
    const v = p.voucher ?? {};
    const busy = Boolean(p.busy);

    const can = (action: string) => (p.allowedActions as string[] | undefined)?.includes(action) ?? false;

    return html`
      <div class="card" role="region" aria-label="Escrow milestone contract">
        <div class="row">
          <span class="title">${p.title ?? "Escrow contract"}</span>
          <span class="amount">${inr(p.amountPaise ?? p.amount_paise)}</span>
        </div>
        <div class="row" style="margin-top:6px">
          <span class="tag ${lbl.cls}">${lbl.text}</span>
          <span class="muted mono">v${p.version ?? 1}</span>
        </div>
        <div class="steps" aria-label="Deal stages">
          ${STEPS.map(
            (s, i) =>
              html`<div class="step ${i < current ? "done" : i === current ? "current" : ""}">
                <div class="bar"></div>
                ${i + 1}. ${s.label}
              </div>`,
          )}
        </div>
        <div class="actions">
          ${role === "buyer" && can("LOCK_ESCROW")
            ? html`<button class="primary" ?disabled=${busy} @click=${() => this.emit("LOCK_ESCROW")}>Lock escrow</button>`
            : nothing}
          ${can("START_ASSAY") || state === "INSPECTION_LIVE"
            ? html`<button class=${state === "FUNDED" ? "primary" : ""} ?disabled=${busy} @click=${() => this.emit("VERIFY_VIDEO")}>
                Verify on live video
              </button>`
            : nothing}
          ${role === "buyer" && can("RELEASE_FUNDS")
            ? html`<button class="primary" ?disabled=${busy} @click=${() => this.emit("RELEASE_FUNDS")}>Release funds</button>`
            : nothing}
          ${can("RAISE_DISPUTE")
            ? html`<button class="danger" ?disabled=${busy} @click=${() => this.emit("RAISE_DISPUTE")}>Raise dispute</button>`
            : nothing}
        </div>
        <div class="sys" aria-label="System voucher">
          [SYS-VOUCHER · ${v.voucher_type ?? "PENDING"} · SHA256:${shortHash(v.curr_voucher_sha256)} · ED25519:${shortHash(
            v.ed25519_signature,
          )}]
        </div>
      </div>
    `;
  }
}
