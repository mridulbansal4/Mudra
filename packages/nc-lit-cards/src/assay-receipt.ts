import { css, html, nothing } from "lit";
import { MudraCardBase, shortHash } from "./base";

/**
 * <nc-video-assay-receipt> - messageType `x-mudra-assay-receipt`.
 * data: { passed, framePhashHex, rpmPeak, minRpm, serial, blurLaplacian, computeMs, engine, thumbnail, signature }
 */
export class MudraAssayReceipt extends MudraCardBase {
  static styles = [
    MudraCardBase.baseStyles,
    css`
      .grid {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        gap: 14px;
        margin-top: 10px;
      }
      .thumb {
        width: 96px;
        height: 72px;
        border-radius: 8px;
        object-fit: cover;
        background: var(--surface-2, #ebe8e1);
      }
      dl {
        margin: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 3px 12px;
        font-size: 12.5px;
      }
      dt {
        color: var(--foreground-muted, #6b6e7a);
      }
      dd {
        margin: 0;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
      }
    `,
  ];

  render() {
    const p = this.payload;
    const passed = Boolean(p.passed ?? p.assay_passed);
    return html`
      <div class="card" role="region" aria-label="Video assay receipt">
        <div class="row">
          <span class="title">Video assay receipt</span>
          <span class="tag ${passed ? "ok" : "frozen"}">${passed ? "Pass" : "Fail"}</span>
        </div>
        <div class="grid">
          ${p.thumbnail ? html`<img class="thumb" src=${p.thumbnail} alt="Captured inspection frame" />` : html`<div class="thumb"></div>`}
          <dl>
            <dt>Frame pHash</dt>
            <dd>${p.framePhashHex ?? p.frame_phash_hex ?? "-"}</dd>
            <dt>Motor RPM</dt>
            <dd>
              ${p.rpmPeak != null ? Number(p.rpmPeak).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "-"}
              ${p.minRpm ? html`<span class="muted">(min ${Number(p.minRpm).toLocaleString("en-IN")})</span>` : nothing}
            </dd>
            <dt>Sharpness</dt>
            <dd>${p.blurLaplacian != null ? Number(p.blurLaplacian).toFixed(1) : "-"}</dd>
            ${p.serial ? html`<dt>Serial plate</dt><dd>${p.serial}</dd>` : nothing}
            <dt>Verifier</dt>
            <dd>${p.engine ?? "rust"}${p.computeMs != null ? ` · ${Number(p.computeMs).toFixed(2)} ms` : ""}</dd>
          </dl>
        </div>
        <div class="sys">[SYS-VOUCHER · ASSAY_VERIFIED · ED25519:${shortHash(p.signature)}]</div>
      </div>
    `;
  }
}
