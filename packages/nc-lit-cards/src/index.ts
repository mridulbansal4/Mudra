import { SamadhanEscrowCard } from "./escrow-deal-card";
import { SamadhanBilingualBubble } from "./bilingual-bubble";
import { SamadhanAssayReceipt } from "./assay-receipt";
import { SamadhanTribunalVerdict } from "./tribunal-verdict";

export { SamadhanCardBase, shortHash, inr } from "./base";
export { SamadhanEscrowCard, SamadhanBilingualBubble, SamadhanAssayReceipt, SamadhanTribunalVerdict };

/** Nexconn custom message types ↔ custom element tags ↔ classes. */
export const SAMADHAN_MESSAGE_TYPES = [
  { messageType: "x-samadhan-escrow-card", tagName: "nc-escrow-deal-card", elementClass: SamadhanEscrowCard, digest: "[Escrow contract]" },
  { messageType: "x-samadhan-bilingual-bubble", tagName: "nc-bilingual-bubble", elementClass: SamadhanBilingualBubble, digest: "[Translated message]" },
  { messageType: "x-samadhan-assay-receipt", tagName: "nc-video-assay-receipt", elementClass: SamadhanAssayReceipt, digest: "[Video assay receipt]" },
  { messageType: "x-samadhan-tribunal-verdict", tagName: "nc-tribunal-verdict", elementClass: SamadhanTribunalVerdict, digest: "[Tribunal verdict]" },
] as const;

/**
 * Define the custom elements for standalone rendering (sandbox / simulated mode).
 * In live ChatUI mode, ChatUI itself defines them during `app.ready()` from `registerCustomMessages`,
 * so call this only when ChatUI is not booted — `customElements.define` can't run twice per tag.
 */
export function defineSamadhanCards(): void {
  for (const t of SAMADHAN_MESSAGE_TYPES) {
    if (!customElements.get(t.tagName)) customElements.define(t.tagName, t.elementClass);
  }
}
