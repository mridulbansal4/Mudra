import { createElement, useEffect, useRef } from "react";

export type CardTag = "nc-escrow-deal-card" | "nc-bilingual-bubble" | "nc-video-assay-receipt" | "nc-tribunal-verdict";

export interface DealActionDetail {
  action: string;
  dealId?: string;
  [k: string]: unknown;
}

/**
 * Renders one of the Lit cards from packages/nc-lit-cards and forwards its
 * `mudra-deal-action` CustomEvent (composed, crosses the Shadow DOM) to React.
 */
export function LitCard(props: { tag: CardTag; data: Record<string, unknown>; viewerRole?: string; onAction?: (d: DealActionDetail) => void }) {
  const ref = useRef<HTMLElement & { data?: unknown; viewerRole?: string }>(null);
  const { onAction } = props;

  useEffect(() => {
    if (ref.current) {
      ref.current.data = props.data;
      if (props.viewerRole) ref.current.viewerRole = props.viewerRole;
    }
  }, [props.data, props.viewerRole]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onAction) return;
    const h = (e: Event) => onAction((e as CustomEvent<DealActionDetail>).detail);
    el.addEventListener("mudra-deal-action", h);
    return () => el.removeEventListener("mudra-deal-action", h);
  }, [onAction]);

  return createElement(props.tag, { ref });
}
