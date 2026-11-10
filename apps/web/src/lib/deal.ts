import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, DealView, FsmAction, Locale, Role } from "@samadhan/shared-types";
import { api } from "./api";
import { subscribeToDealRealtime } from "./supabase";

export interface LiveDeal extends DealView {
  buyer_name?: string;
  seller_name?: string;
  buyer_locale?: Locale;
  seller_locale?: Locale;
  allowed_actions?: FsmAction[];
}

/** Fetches a deal and keeps it live via the gateway's SSE stream (falls back to 3 s polling). */
export function useLiveDeal(dealId: string | undefined, jwt: string | undefined) {
  const [deal, setDeal] = useState<LiveDeal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<"sse" | "polling" | "idle">("idle");
  const pollRef = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!dealId) return;
    try {
      const d = await api.get<LiveDeal>(`/api/v1/deals/${encodeURIComponent(dealId)}`, jwt);
      setDeal(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [dealId, jwt]);

  useEffect(() => {
    if (!dealId) return;
    void refresh();
    const qs = jwt ? `?access_token=${encodeURIComponent(jwt)}` : "";
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/v1/deals/${encodeURIComponent(dealId)}/events${qs}`);
      es.addEventListener("open", () => setConnection("sse"));
      es.addEventListener("deal", (ev) => {
        try {
          setDeal(JSON.parse((ev as MessageEvent).data));
        } catch {
          /* ignore malformed frame */
        }
      });
      es.addEventListener("message", (ev) => {
        try {
          const m = JSON.parse((ev as MessageEvent).data) as ChatMessage;
          if (!m?.id) return;
          setDeal((d) => (d ? { ...d, messages: [...(d.messages ?? []).filter((x) => x.id !== m.id), m] } : d));
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("error", () => {
        setConnection("polling");
        es?.close();
        es = null;
        if (!pollRef.current) pollRef.current = window.setInterval(() => void refresh(), 3000);
      });
    } catch {
      setConnection("polling");
      pollRef.current = window.setInterval(() => void refresh(), 3000);
    }
    const stopRealtime = subscribeToDealRealtime(dealId, () => {
      void refresh();
    });
    return () => {
      stopRealtime();
      es?.close();
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = undefined;
    };
  }, [dealId, jwt, refresh]);

  return { deal, setDeal, error, refresh, connection };
}

export interface TransitionResult {
  deal_id: string;
  prev_state: string;
  fsm_state: string;
  version: number;
  go_exec_time_us?: number;
  system_voucher?: { voucher_type: string; curr_voucher_sha256: string; ed25519_signature: string };
}

export function transition(dealId: string, action: FsmAction, expectedVersion: number, jwt: string) {
  return api.post<TransitionResult>(
    `/api/v1/deals/${dealId}/escrow/transition`,
    { action, expected_version: expectedVersion, upi_mandate_umn: action === "LOCK_ESCROW" ? "samadhan.demo@okaxis" : undefined },
    jwt,
  );
}

export function sendDealMessage(dealId: string, body: { sender_role: Role; text: string; source_locale: Locale; target_locale: Locale }, jwt: string) {
  return api.post<ChatMessage>(`/api/v1/deals/${dealId}/messages`, body, jwt);
}

export const QUICK_PHRASES: Record<Locale, { label: string; text: string }[]> = {
  "ta-IN": [
    { label: "Tamil offer", text: "நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM சோதனை தேவை" },
    { label: "Ask warranty", text: "6 மாத வாரண்டி கொடுப்பீர்களா?" },
  ],
  "hi-IN": [
    { label: "Hindi reply", text: "₹1,45,000 ठीक है, मैं लाइव वीडियो पर सीरियल नंबर दिखा दूँगा" },
    { label: "Offer warranty", text: "6 महीने की वारंटी दूँगा, मोटर 4820 RPM पर चलती है" },
  ],
  "mr-IN": [{ label: "Marathi offer", text: "मी ₹1,40,000 देईन, 6 महिने वॉरंटी हवी" }],
  "en-IN": [
    { label: "English offer", text: "I can pay ₹1,45,000 if the motor runs at 4800 RPM on live video" },
    { label: "Ask warranty", text: "Will you include 6 months warranty?" },
  ],
};
