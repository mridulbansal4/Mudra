import { LitElement, css } from "lit";

/**
 * Base for all MUDRA message cards.
 *
 * Cards render from either:
 *  - `data`: a plain object set directly by our React shell (simulated / sandbox mode), or
 *  - `message`: the ChatUIMessageModel handed over by @nexconn/chatui when the card is registered
 *    via `app.registerCustomMessages([{ messageType, component: { tagName, elementClass } }])`.
 *
 * Actions leave the Shadow DOM as `mudra-deal-action` events (bubbles + composed) so React can
 * listen once at the workbench root.
 */
export class MudraCardBase extends LitElement {
  static properties = {
    data: { type: Object },
    message: { type: Object },
    viewerRole: { type: String, attribute: "viewer-role" },
  };

  declare data: Record<string, any> | undefined;
  declare message: Record<string, any> | undefined;
  declare viewerRole: string | undefined;

  protected get payload(): Record<string, any> {
    if (this.data) return this.data;
    const c = this.message?.content;
    if (!c) return {};
    if (typeof c === "string") {
      try {
        const parsed = JSON.parse(c);
        return parsed.customExtras ?? parsed.extra ?? parsed;
      } catch {
        return { text: c };
      }
    }
    return c.customExtras ?? c.extra ?? c;
  }

  protected emit(action: string, detail: Record<string, unknown> = {}) {
    this.dispatchEvent(
      new CustomEvent("mudra-deal-action", {
        detail: { action, dealId: this.payload.dealId ?? this.payload.deal_id, ...detail },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static baseStyles = css`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
      color: var(--foreground, #1b1c22);
      font-size: 14px;
      line-height: 1.45;
    }
    .card {
      border: 1px solid var(--border-hairline, rgba(28, 30, 38, 0.1));
      border-radius: 12px;
      background: var(--surface-1, #fcfbf9);
      padding: 16px 18px;
    }
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .title {
      font-size: 15px;
      font-weight: 600;
      min-width: 0;
      overflow-wrap: break-word;
    }
    .muted {
      color: var(--foreground-muted, #6b6e7a);
      font-size: 12px;
    }
    .mono {
      font-family: var(--font-mono, ui-monospace, monospace);
      font-variant-numeric: tabular-nums;
    }
    .amount {
      font-family: var(--font-mono, ui-monospace, monospace);
      font-variant-numeric: tabular-nums;
      font-size: 18px;
      font-weight: 600;
      white-space: nowrap;
    }
    .sys {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--border-hairline, rgba(28, 30, 38, 0.08));
      font-family: var(--font-mono, ui-monospace, monospace);
      font-variant-numeric: tabular-nums;
      font-size: 11px;
      color: var(--foreground-muted, #6b6e7a);
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    button {
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      padding: 7px 12px;
      cursor: pointer;
      border: 1px solid var(--border-hairline, rgba(28, 30, 38, 0.14));
      background: var(--surface-2, #f1efea);
      color: var(--foreground, #1b1c22);
      transition: transform 100ms ease-out, background-color 150ms ease-out;
    }
    button:active {
      transform: scale(0.97);
    }
    button:focus-visible {
      outline: 2px solid var(--accent, #c84b20);
      outline-offset: 2px;
    }
    button.primary {
      background: var(--accent, #c84b20);
      color: var(--accent-foreground, #fff);
      border-color: transparent;
    }
    button.danger {
      color: var(--freeze-danger, #c23a2b);
      border-color: color-mix(in oklch, var(--freeze-danger, #c23a2b) 35%, transparent);
      background: transparent;
    }
    button[disabled] {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 9px;
      border-radius: 11px;
      font-size: 12px;
      font-weight: 500;
      background: var(--surface-2, #f1efea);
      color: var(--foreground-secondary, #464955);
      white-space: nowrap;
    }
    .tag.ok {
      background: var(--vault-locked-bg, #e3f3ea);
      color: var(--vault-locked, #1f7a4d);
    }
    .tag.live {
      background: color-mix(in oklch, var(--assay-active, #2f66c4) 14%, transparent);
      color: var(--assay-active, #2f66c4);
    }
    .tag.frozen {
      background: var(--freeze-danger-bg, #fbe6e2);
      color: var(--freeze-danger, #c23a2b);
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
    }
  `;
}

export function shortHash(h?: string, head = 4, tail = 4): string {
  if (!h) return "pending";
  const clean = h.replace(/^sig_ed25519_/, "");
  return clean.length <= head + tail + 1 ? clean : `${clean.slice(0, head)}…${clean.slice(-tail)}`;
}

export function inr(paise?: number): string {
  if (paise == null || Number.isNaN(paise)) return "-";
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}
