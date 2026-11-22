import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@heroui/react";
import type { ChatMessage, FsmAction, FsmState, Locale, Role } from "@mudra/shared-types";
import { LOCALE_LABEL, formatInr } from "@mudra/shared-types";
import { api, errorText } from "../lib/api";
import { QUICK_PHRASES, sendDealMessage, transition, type LiveDeal } from "../lib/deal";
import { LitCard, type CardTag, type DealActionDetail } from "./LitCard";
import { AssayLoupe, type AssayCapture, type InspectionCall } from "./AssayLoupe";
import { Banner } from "./Chrome";

const TAG_BY_TYPE: Record<string, CardTag> = {
  "x-mudra-bilingual-bubble": "nc-bilingual-bubble",
  "x-mudra-escrow-card": "nc-escrow-deal-card",
  "x-mudra-assay-receipt": "nc-video-assay-receipt",
  "x-mudra-tribunal-verdict": "nc-tribunal-verdict",
};

function flipBits(hex: string, n = 2): string {
  const chars = hex.split("");
  for (let i = 0; i < n && i < chars.length; i++) {
    const idx = chars.length - 1 - i * 3;
    chars[idx] = (parseInt(chars[idx], 16) ^ 1).toString(16);
  }
  return chars.join("");
}

export interface DealActionsState {
  busy: boolean;
  error: string | null;
  notice: string | null;
  loupeOpen: boolean;
  challenge: { required_serial_plate?: string; min_motor_rpm?: number; challenge_nonce?: string } | null;
}

/** All deal mutations, shared by /app, /sandbox and /dispatch. */
export function useDealActions(deal: LiveDeal | null, jwt: string | undefined, refresh: () => Promise<void>) {
  const [st, setSt] = useState<DealActionsState>({ busy: false, error: null, notice: null, loupeOpen: false, challenge: null });
  const set = (p: Partial<DealActionsState>) => setSt((s) => ({ ...s, ...p }));

  const run = useCallback(
    async (d: DealActionDetail) => {
      if (!deal || !jwt) return;
      const id = deal.deal_id;
      const version = deal.escrow_contract.version;
      set({ busy: true, error: null, notice: null });
      try {
        switch (d.action) {
          case "LOCK_ESCROW":
          case "RELEASE_FUNDS":
          case "START_ASSAY":
          case "MARK_ASSAY_VERIFIED": {
            const r = await transition(id, d.action as FsmAction, version, jwt);
            set({ notice: `${r.prev_state} to ${r.fsm_state} in ${r.go_exec_time_us ?? "?"} µs (v${r.version})` });
            break;
          }
          case "VERIFY_VIDEO": {
            const c = await api.post<DealActionsState["challenge"]>(`/api/v1/deals/${id}/assay/start`, { stage_tag: "PRE_SHIPMENT", simulated_hd_camera: true }, jwt);
            set({ challenge: c, loupeOpen: true });
            break;
          }
          case "RAISE_DISPUTE": {
            const last = [...(deal.assay_logs ?? [])].reverse().find((a) => a.frame_phash_hex)?.frame_phash_hex ?? "a4f19c83e2b0771d";
            const r = await api.post<{ freeze_latency_ms?: number; hamming_distance_phash?: number }>(
              `/api/v1/deals/${id}/dispute/freeze`,
              {
                reason_code: "TRANSIT_DAMAGE",
                description: "Hairline crack on the motor bracket after unloading; spindle still runs at 4,810 RPM.",
                post_delivery_phash_hex: flipBits(last, 2),
              },
              jwt,
            );
            set({ notice: `Channel frozen in ${r.freeze_latency_ms ?? "?"} ms · pHash distance ${r.hamming_distance_phash ?? "?"}` });
            break;
          }
          case "RESOLVE_SPLIT":
          case "REFUND_BUYER": {
            const disputeId = deal.dispute?.dispute_id;
            if (!disputeId) throw new Error("No open dispute on this deal");
            const buyer = d.action === "REFUND_BUYER" ? 10000 : Number(d.buyerRefundBps ?? deal.dispute?.recommended_split?.buyer_refund_bps ?? 0);
            await api.post(`/api/v1/dispatch/assign`, { dispute_id: disputeId, arbitrator_nexconn_id: "arbitrator_meera_sg_8821" }, jwt).catch(() => undefined);
            await api.post(
              `/api/v1/disputes/${disputeId}/resolve`,
              { buyer_refund_bps: buyer, seller_payout_bps: 10000 - buyer, expected_version: version, resolution_note: "Executed from MUDRA dispatch" },
              jwt,
            );
            set({ notice: "Binding split executed, channel unfrozen" });
            break;
          }
        }
        await refresh();
      } catch (e) {
        set({ error: errorText(e) });
      } finally {
        set({ busy: false });
      }
    },
    [deal, jwt, refresh],
  );

  const onCapture = useCallback(
    async (c: AssayCapture) => {
      if (!deal || !jwt) return;
      set({ busy: true, error: null });
      try {
        const r = await api.post<{ assay_passed: boolean; audio_fft_rpm_peak?: number; frame_phash_hex?: string; rust_compute_ms?: number }>(
          `/api/v1/deals/${deal.deal_id}/assay/verify-frame`,
          {
            nexconn_call_id: c.callId ?? `call_local_${Date.now()}`,
            stage_tag: "PRE_SHIPMENT",
            challenge_nonce: st.challenge?.challenge_nonce,
            wasm_blur_laplacian: Math.round(c.blurLaplacian * 10) / 10,
            frame_jpeg_base64: c.jpegBase64,
            audio_pcm_f32_base64: c.audioPcmBase64,
            sample_rate: c.sampleRate,
            client_phash_hex: c.localPhash,
            thumbnail_data_url: c.thumbnail,
          },
          jwt,
        );
        set({
          loupeOpen: !r.assay_passed,
          notice: r.assay_passed
            ? `Assay passed · ${Math.round(r.audio_fft_rpm_peak ?? 0).toLocaleString("en-IN")} RPM · pHash ${r.frame_phash_hex ?? c.localPhash}`
            : null,
          error: r.assay_passed ? null : "Assay did not pass. Hold the plate steady and capture again",
        });
        await refresh();
      } catch (e) {
        set({ error: errorText(e) });
      } finally {
        set({ busy: false });
      }
    },
    [deal, jwt, refresh, st.challenge],
  );

  return { ...st, run, onCapture, closeLoupe: () => set({ loupeOpen: false }), clearNotice: () => set({ notice: null, error: null }) };
}

function messageData(m: ChatMessage, viewerRole: Role, deal: LiveDeal): Record<string, unknown> {
  const x = (m.extras ?? {}) as Record<string, unknown>;
  switch (m.message_type) {
    case "x-mudra-bilingual-bubble":
      return {
        senderName: m.sender_name ?? m.sender_role,
        sourceLocale: m.source_locale,
        targetLocale: m.target_locale,
        rawText: m.raw_text,
        translatedText: m.translated_text,
        terms: m.extracted_terms,
        mine: m.sender_role === viewerRole,
        piiRedacted: x.pii_redacted_count,
      };
    case "x-mudra-escrow-card":
      return {
        dealId: deal.deal_id,
        title: x.title ?? deal.title,
        amountPaise: x.amount_paise ?? deal.escrow_contract.amount_paise,
        fsmState: x.fsm_state ?? x.new_state,
        version: x.version,
        voucher: x.system_voucher ?? x.voucher ?? { voucher_type: x.voucher_type, curr_voucher_sha256: x.curr_voucher_sha256, ed25519_signature: x.ed25519_signature },
        allowedActions: [],
      };
    case "x-mudra-assay-receipt":
      return {
        passed: x.assay_passed,
        framePhashHex: x.frame_phash_hex,
        rpmPeak: x.audio_fft_rpm_peak,
        minRpm: x.min_motor_rpm,
        blurLaplacian: x.wasm_blur_laplacian ?? x.blur_laplacian,
        serial: x.detected_serial_text,
        computeMs: x.rust_compute_ms,
        engine: x.engine,
        thumbnail: x.thumbnail_data_url,
        signature: x.ed25519_sig_hex,
      };
    case "x-mudra-tribunal-verdict":
      return {
        disputeId: x.dispute_id,
        amountPaise: deal.escrow_contract.amount_paise,
        buyerRefundBps:
          x.buyer_refund_bps ??
          (x.recommended_split as Record<string, unknown> | undefined)?.buyer_refund_bps ??
          (x.buyer_refund_paise != null ? Math.round((Number(x.buyer_refund_paise) / deal.escrow_contract.amount_paise) * 10000) : undefined),
        sellerPayoutBps: x.seller_payout_bps ?? (x.recommended_split as Record<string, unknown> | undefined)?.seller_payout_bps,
        summary: x.summary,
        rationale: x.rationale,
        hamming: x.hamming_distance_phash,
        freezeRemainingSec: deal.dispute?.freeze_remaining_sec,
        resolved: deal.escrow_contract.fsm_state !== "DISPUTED_FROZEN",
      };
    default:
      return { text: m.raw_text ?? m.translated_text };
  }
}

/** One participant's view of a deal channel: timeline, live escrow card, composer and assay loupe. */
export function DealRoom(props: {
  deal: LiveDeal;
  viewerRole: Role;
  viewerLocale: Locale;
  jwt?: string;
  refresh: () => Promise<void>;
  simulatedCamera?: boolean;
  call?: InspectionCall;
  compact?: boolean;
  title?: string;
}) {
  const { deal, viewerRole, jwt } = props;
  const actions = useDealActions(deal, jwt, props.refresh);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const state = deal.escrow_contract.fsm_state as FsmState;
  const frozen = state === "DISPUTED_FROZEN";
  const counterLocale = (viewerRole === "buyer" ? deal.seller_locale : deal.buyer_locale) ?? "hi-IN";
  const messages = deal.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  const escrowData = useMemo(
    () => ({
      dealId: deal.deal_id,
      title: deal.title,
      amountPaise: deal.escrow_contract.amount_paise,
      fsmState: state,
      version: deal.escrow_contract.version,
      voucher: deal.system_vouchers?.[deal.system_vouchers.length - 1],
      allowedActions: deal.allowed_actions ?? [],
      busy: actions.busy,
      viewerRole,
    }),
    [deal, state, actions.busy, viewerRole],
  );

  const send = async (t: string) => {
    if (!jwt || !t.trim()) return;
    setSending(true);
    setSendErr(null);
    try {
      await sendDealMessage(deal.deal_id, { sender_role: viewerRole, text: t.trim(), source_locale: props.viewerLocale, target_locale: counterLocale }, jwt);
      setText("");
      await props.refresh();
    } catch (e) {
      setSendErr(errorText(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col" aria-label={props.title ?? `${viewerRole} view`}>
      <div className="flex items-baseline justify-between gap-3 border-b hairline px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-ink">{props.title ?? deal.title}</div>
          <div className="text-[12.5px] text-ink-3">
            {deal.buyer_name ?? "Buyer"} ({deal.buyer_locale}) and {deal.seller_name ?? "Seller"} ({deal.seller_locale}) · Group channel{" "}
            <span className="num">{deal.nexconn_channel_id}</span>
          </div>
        </div>
        <div className="num shrink-0 text-[15px] text-ink">{formatInr(deal.escrow_contract.amount_paise)}</div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-[14px] text-ink-3">No messages yet. Send the first offer with a quick phrase below.</p>
        ) : null}
        {messages.map((m) => {
          const tag = TAG_BY_TYPE[m.message_type];
          return tag ? (
            <div key={m.id} className="fade-in">
              <LitCard tag={tag} data={messageData(m, viewerRole, deal)} viewerRole={viewerRole} onAction={actions.run} />
            </div>
          ) : (
            <div key={m.id} className="text-[13px] text-ink-3">
              {m.raw_text}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t hairline bg-canvas px-4 pb-3 pt-3">
        {actions.notice ? <div className="mb-2"><Banner tone="ok">{actions.notice}</Banner></div> : null}
        {actions.error ? <div className="mb-2"><Banner tone="danger">{actions.error}</Banner></div> : null}
        <LitCard tag="nc-escrow-deal-card" data={escrowData} viewerRole={viewerRole} onAction={actions.run} />
        {frozen ? (
          <div className="mt-3">
            <Banner tone="danger">
              Channel frozen for arbitration via GroupChannelModerationApi.addGroupChannelFreezeList.{" "}
              {deal.dispute?.freeze_remaining_sec != null ? <span className="num">{deal.dispute.freeze_remaining_sec}s left in the freeze window.</span> : null}
            </Banner>
          </div>
        ) : (
          <div className="mt-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {(QUICK_PHRASES[props.viewerLocale] ?? []).map((q) => (
                <button
                  key={q.label}
                  className="press rounded-[11px] border hairline bg-paper px-2.5 py-1 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-50"
                  disabled={sending || !jwt}
                  onClick={() => void send(q.text)}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(text);
              }}
            >
              <label className="sr-only" htmlFor={`composer-${viewerRole}`}>
                Message in {LOCALE_LABEL[props.viewerLocale]}
              </label>
              <input
                id={`composer-${viewerRole}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Type in ${LOCALE_LABEL[props.viewerLocale]} or English`}
                className="min-w-0 flex-1 rounded-lg border hairline bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-seal"
                lang={props.viewerLocale}
              />
              <Button type="submit" variant="secondary" isDisabled={sending || !text.trim() || !jwt}>
                {sending ? "Sending" : "Send"}
              </Button>
            </form>
            {sendErr ? <p className="mt-1.5 text-[12.5px] text-freeze">{sendErr}</p> : null}
          </div>
        )}
      </div>

      {actions.loupeOpen ? (
        <AssayLoupe simulated={props.simulatedCamera ?? true} call={props.call} busy={actions.busy} challenge={actions.challenge} onCapture={actions.onCapture} onClose={actions.closeLoupe} />
      ) : null}
    </section>
  );
}

export function VoucherChain({ deal }: { deal: LiveDeal }) {
  const vs = deal.system_vouchers ?? [];
  return (
    <div>
      <h3 className="mb-2 text-[14px] font-medium text-ink">System channel voucher chain</h3>
      {vs.length === 0 ? <p className="text-[13px] text-ink-3">No vouchers yet. Each FSM transition signs one.</p> : null}
      <ol className="space-y-2">
        {vs.map((v, i) => (
          <li key={v.curr_voucher_sha256 + i} className="rounded-lg border hairline bg-paper px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium text-ink">{v.voucher_type}</span>
              <span className="text-[11.5px] text-ink-3">{v.engine ?? ""}</span>
            </div>
            <div className="num mt-1 break-all text-[11px] text-ink-3">sha256 {v.curr_voucher_sha256}</div>
            <div className="num break-all text-[11px] text-ink-3">prev {v.prev_voucher_sha256 || "none"}</div>
            <div className="num break-all text-[11px] text-ink-3">ed25519 {v.ed25519_signature?.slice(0, 48)}…</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
