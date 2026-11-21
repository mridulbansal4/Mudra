import { MudraEscrowCard } from "./escrow-deal-card";
import { MudraBilingualBubble } from "./bilingual-bubble";
import { MudraAssayReceipt } from "./assay-receipt";
import { MudraTribunalVerdict } from "./tribunal-verdict";

export { MudraCardBase, shortHash, inr } from "./base";
export { MudraEscrowCard, MudraBilingualBubble, MudraAssayReceipt, MudraTribunalVerdict };

/** Nexconn custom message types ↔ custom element tags ↔ classes. */
export const MUDRA_MESSAGE_TYPES = [
  { messageType: "x-mudra-escrow-card", tagName: "nc-escrow-deal-card", elementClass: MudraEscrowCard, digest: "[Escrow contract]" },
  { messageType: "x-mudra-bilingual-bubble", tagName: "nc-bilingual-bubble", elementClass: MudraBilingualBubble, digest: "[Translated message]" },
  { messageType: "x-mudra-assay-receipt", tagName: "nc-video-assay-receipt", elementClass: MudraAssayReceipt, digest: "[Video assay receipt]" },
  { messageType: "x-mudra-tribunal-verdict", tagName: "nc-tribunal-verdict", elementClass: MudraTribunalVerdict, digest: "[Tribunal verdict]" },
] as const;

/**
 * Define the custom elements for standalone rendering (sandbox / simulated mode).
 * In live ChatUI mode, ChatUI itself defines them during `app.ready()` from `registerCustomMessages`,
 * so call this only when ChatUI is not booted - `customElements.define` can't run twice per tag.
 */
export function defineMudraCards(): void {
  for (const t of MUDRA_MESSAGE_TYPES) {
    if (!customElements.get(t.tagName)) customElements.define(t.tagName, t.elementClass);
  }
}
