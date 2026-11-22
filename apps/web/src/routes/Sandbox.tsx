import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@heroui/react";
import type { FsmState, Locale, NexconnSession } from "@mudra/shared-types";
import { Wordmark, Banner } from "../components/Chrome";
import { StoryBar } from "../components/StoryBar";
import { DealRoom, VoucherChain, useDealActions } from "../components/DealRoom";
import { LitCard } from "../components/LitCard";
import { api, errorText } from "../lib/api";
import { QUICK_PHRASES, sendDealMessage, transition, useLiveDeal } from "../lib/deal";
import { signIn } from "../lib/personas";
import { captureFrame, drawSimulatedFrame, laplacianVariance, synthMotorPcmBase64, DEMO_RPM } from "../lib/assay";
import { bootNexconn, onNexconnEvent, readGroupHistory, type NexconnStatus } from "../lib/nexconn-boot";

interface Provision {
  deal_id: string;
  nexconn_channel_id: string;
  buyer_session: NexconnSession;
  seller_session: NexconnSession;
  escrow_contract: { fsm_state: FsmState; version: number };
}

const KEY = "mudra.sandbox.v1";
const TOUR = ["Send the Tamil offer", "Lock escrow", "Verify on live video", "Raise a dispute", "Execute the split"];

function simulatedCapture() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 480;
  drawSimulatedFrame(c.getContext("2d")!, 640, 480, performance.now());
  const f = captureFrame(c);
  return { jpeg: f.jpegBase64, thumb: captureFrame(c, 160, 120).dataUrl, blur: laplacianVariance(f.rgba, f.width, f.height) };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Sandbox() {
  const [prov, setProv] = useState<Provision | null>(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Provision) : null;
    } catch {
      return null;
    }
  });
  const [arbJwt, setArbJwt] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [pane, setPane] = useState<"buyer" | "seller" | "judge">("buyer");
  const abort = useRef(false);

  const provision = useCallback(async () => {
    setErr(null);
    try {
      const p = await api.post<Provision>("/api/v1/sandbox/provision", { scenario: "JUKI_OVERLOCK_8821" });
      sessionStorage.setItem(KEY, JSON.stringify(p));
      setProv(p);
      setTourStep(0);
      setLog([`Provisioned deal ${p.deal_id} on channel ${p.nexconn_channel_id} with 2 Nexconn tokens`]);
    } catch (e) {
      setErr(errorText(e));
    }
  }, []);

  useEffect(() => {
    if (!prov) void provision();
    signIn({ preset: "P-04_MEERA", displayName: "Meera Krishnan", role: "arbitrator", locale: "en-IN" }, false)
      .then((s) => setArbJwt(s.jwt))
      .catch(() => undefined);
  }, [prov, provision]);

  const buyerJwt = prov?.buyer_session.mudra_jwt;
  const sellerJwt = prov?.seller_session.mudra_jwt;
  const { deal, refresh, error: dealErr } = useLiveDeal(prov?.deal_id, buyerJwt);
  const judge = useDealActions(deal, arbJwt, refresh);

  const state = (deal?.escrow_contract.fsm_state ?? "CREATED") as FsmState;
  const buyerLocale = (prov?.buyer_session.locale ?? "ta-IN") as Locale;
  const sellerLocale = (prov?.seller_session.locale ?? "hi-IN") as Locale;

  const note = (m: string) => setLog((l) => [...l.slice(-30), m]);

  // Connect the browser to Nexconn with the buyer's server-issued token, and log what arrives over the WebSocket.
  const [ncStatus, setNcStatus] = useState<NexconnStatus>("connecting");
  const ncAppKey = prov?.buyer_session.app_key;
  useEffect(() => {
    const s = prov?.buyer_session;
    if (!s) return;
    void bootNexconn({ appKey: s.app_key, token: s.access_token, mode: s.mode ?? s.token_mode }).then(setNcStatus);
    return onNexconnEvent((e) => {
      if (e.kind === "connected") note(`Nexconn client connected as ${e.userId} (NCEngine.connect code 0)`);
      else if (e.kind === "message") note(`Received via Nexconn WebSocket: ${e.messageType} ${e.messageId}`);
      else if (e.kind === "stream") note(`Received via Nexconn WebSocket: RC:StreamMsg ${e.messageId} (${e.phase})`);
      else if (e.kind === "error") note(`Nexconn client error: ${e.message}`);
    });
  }, [prov?.buyer_session]);

  // Whenever the deal gets a new message, read the Group channel through the browser Chat SDK and log what Nexconn holds.
  const seenNexconn = useRef(new Set<string>());
  const msgCount = deal?.messages?.length ?? 0;
  useEffect(() => {
    const channel = prov?.nexconn_channel_id;
    if (ncStatus !== "connected" || !channel || msgCount === 0) return;
    const t = window.setTimeout(() => {
      readGroupHistory(channel)
        .then((list) => {
          for (const m of list) {
            if (seenNexconn.current.has(m.messageId)) continue;
            seenNexconn.current.add(m.messageId);
            note(`Read via Nexconn Chat SDK: ${m.messageType} ${m.messageId} from ${m.senderUserId}`);
          }
        })
        .catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [ncStatus, prov?.nexconn_channel_id, msgCount]);

  const autoplay = async () => {
    if (!prov || !buyerJwt || !sellerJwt) return;
    setPlaying(true);
    abort.current = false;
    const id = prov.deal_id;
    try {
      const cur = async () => (await api.get<{ escrow_contract: { fsm_state: FsmState; version: number }; assay_logs?: { frame_phash_hex?: string }[] }>(`/api/v1/deals/${id}`, buyerJwt));
      let d = await cur();
      if (d.escrow_contract.fsm_state === "CREATED") {
        setTourStep(0);
        await sendDealMessage(id, { sender_role: "buyer", text: QUICK_PHRASES[buyerLocale][0].text, source_locale: buyerLocale, target_locale: sellerLocale }, buyerJwt);
        note("Buyer offer PII-scrubbed and translated ta-IN to hi-IN");
        await wait(1500);
        await sendDealMessage(id, { sender_role: "seller", text: QUICK_PHRASES[sellerLocale][0].text, source_locale: sellerLocale, target_locale: buyerLocale }, sellerJwt);
        note("Seller reply translated hi-IN to ta-IN");
        await wait(1500);
        setTourStep(1);
        const r = await transition(id, "LOCK_ESCROW", d.escrow_contract.version, buyerJwt);
        note(`LOCK_ESCROW in ${r.go_exec_time_us ?? "?"} µs, voucher ${r.system_voucher?.curr_voucher_sha256?.slice(0, 12) ?? ""}`);
        await wait(1500);
      }
      if (abort.current) return;
      d = await cur();
      if (d.escrow_contract.fsm_state === "FUNDED" || d.escrow_contract.fsm_state === "INSPECTION_LIVE") {
        setTourStep(2);
        const ch = await api.post<{ challenge_nonce?: string }>(`/api/v1/deals/${id}/assay/start`, { stage_tag: "PRE_SHIPMENT", simulated_hd_camera: true }, buyerJwt);
        const cap = simulatedCapture();
        const v = await api.post<{ assay_passed: boolean; audio_fft_rpm_peak?: number; frame_phash_hex?: string }>(
          `/api/v1/deals/${id}/assay/verify-frame`,
          {
            nexconn_call_id: `call_sandbox_${Date.now()}`,
            stage_tag: "PRE_SHIPMENT",
            challenge_nonce: ch.challenge_nonce,
            wasm_blur_laplacian: Math.round(cap.blur * 10) / 10,
            frame_jpeg_base64: cap.jpeg,
            audio_pcm_f32_base64: synthMotorPcmBase64(DEMO_RPM),
            sample_rate: 48000,
            thumbnail_data_url: cap.thumb,
          },
          buyerJwt,
        );
        note(`Video assay ${v.assay_passed ? "passed" : "failed"}: ${Math.round(v.audio_fft_rpm_peak ?? 0)} RPM, pHash ${v.frame_phash_hex ?? "?"}`);
        await wait(1800);
      }
      if (abort.current) return;
      d = await cur();
      if (d.escrow_contract.fsm_state === "ASSAY_VERIFIED") {
        setTourStep(3);
        const ph = [...(d.assay_logs ?? [])].reverse().find((a) => a.frame_phash_hex)?.frame_phash_hex ?? "a4f19c83e2b0771d";
        const post = ph.slice(0, -1) + (parseInt(ph.slice(-1), 16) ^ 3).toString(16);
        const r = await api.post<{ freeze_latency_ms?: number; hamming_distance_phash?: number }>(
          `/api/v1/deals/${id}/dispute/freeze`,
          { reason_code: "TRANSIT_DAMAGE", description: "Hairline crack on the motor bracket after unloading; spindle still runs at 4,810 RPM.", post_delivery_phash_hex: post },
          buyerJwt,
        );
        note(`Channel frozen in ${r.freeze_latency_ms ?? "?"} ms, pHash distance ${r.hamming_distance_phash ?? "?"}`);
        await wait(2200);
      }
      if (abort.current) return;
      setTourStep(4);
      await refresh();
      note("Waiting for the arbitrator: press Execute binding split in the tribunal pane");
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setPlaying(false);
      await refresh();
    }
  };

  useEffect(() => {
    const st = deal?.escrow_contract.fsm_state;
    if (!st) return;
    if (st === "FUNDED") setTourStep((t) => Math.max(t, 2));
    else if (st === "INSPECTION_LIVE") setTourStep((t) => Math.max(t, 2));
    else if (st === "ASSAY_VERIFIED") setTourStep((t) => Math.max(t, 3));
    else if (st === "DISPUTED_FROZEN") setTourStep((t) => Math.max(t, 4));
    else if (st === "ARBITRATED_SPLIT" || st === "REFUNDED" || st === "RELEASED") setTourStep(5);
    else if (deal?.messages?.length) setTourStep((t) => Math.max(t, 1));
  }, [deal?.escrow_contract.fsm_state, deal?.messages?.length]);

  const dispute = deal?.dispute;

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="glass z-30 border-b hairline">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Wordmark />
          <span className="text-[13px] text-ink-3">Sandbox</span>
          <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px]" aria-label="Guided tour">
            {TOUR.map((t, i) => (
              <li key={t} className={`rounded-[11px] px-2.5 py-0.5 ${i < tourStep ? "bg-vault-bg text-vault" : i === tourStep ? "bg-seal text-seal-ink" : "bg-well text-ink-3"}`}>
                {i + 1}. {t}
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`num rounded-[11px] px-2.5 py-0.5 text-[12px] ${ncStatus === "connected" ? "bg-vault-bg text-vault" : ncStatus === "error" ? "bg-well text-seal" : "bg-well text-ink-3"}`}
              title="Browser-side Nexconn Chat SDK connection"
            >
              {ncStatus === "connected"
                ? `Nexconn: connected${ncAppKey ? ` (app ${ncAppKey})` : ""}`
                : ncStatus === "error"
                  ? "Nexconn: error"
                  : ncStatus === "simulated"
                    ? "Nexconn: simulated"
                    : "Nexconn: connecting"}
            </span>
            <Button size="sm" variant="primary" isDisabled={playing || !deal} onPress={() => void autoplay()}>
              {playing ? "Playing" : "Auto-play 45s demo"}
            </Button>
            <Button size="sm" variant="outline" isDisabled={playing} onPress={() => void provision()}>
              Reset deal
            </Button>
            <Link to="/" className="text-[13px] text-ink-3 no-underline hover:text-ink">
              Exit
            </Link>
          </div>
        </div>
      </header>
      {deal ? <StoryBar state={state} /> : null}
      {err || dealErr ? <div className="px-4 pt-2"><Banner tone="danger">{err ?? dealErr}</Banner></div> : null}

      <div className="flex gap-1 border-b hairline px-4 py-2 xl:hidden" role="tablist" aria-label="Sandbox panes">
        {(["buyer", "seller", "judge"] as const).map((p) => (
          <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={`press rounded-md px-3 py-1 text-[13px] capitalize ${pane === p ? "bg-well text-ink" : "text-ink-3"}`}>
            {p === "judge" ? "Tribunal and telemetry" : p}
          </button>
        ))}
      </div>

      {!deal ? (
        <div className="p-8 text-[14px] text-ink-3">{err ? "Start the services with pnpm dev, then press Reset deal." : "Provisioning two Nexconn sessions and a Group channel"}</div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
          <div className={`relative min-h-0 border-r hairline ${pane === "buyer" ? "" : "hidden xl:block"}`}>
            <DealRoom deal={deal} viewerRole="buyer" viewerLocale={buyerLocale} jwt={buyerJwt} refresh={refresh} title={`Buyer · ${deal.buyer_name ?? "Rajesh"} (${buyerLocale})`} />
          </div>
          <div className={`relative min-h-0 border-r hairline ${pane === "seller" ? "" : "hidden xl:block"}`}>
            <DealRoom deal={deal} viewerRole="seller" viewerLocale={sellerLocale} jwt={sellerJwt} refresh={refresh} title={`Seller · ${deal.seller_name ?? "Vikram"} (${sellerLocale})`} />
          </div>
          <aside className={`min-h-0 space-y-6 overflow-y-auto px-4 py-4 ${pane === "judge" ? "" : "hidden xl:block"}`} aria-label="Tribunal and telemetry">
            <div>
              <h3 className="mb-2 text-[14px] font-medium text-ink">Tribunal desk · Meera (arbitrator)</h3>
              {dispute && state === "DISPUTED_FROZEN" ? (
                <LitCard
                  tag="nc-tribunal-verdict"
                  data={{
                    disputeId: dispute.dispute_id,
                    amountPaise: deal.escrow_contract.amount_paise,
                    buyerRefundBps: dispute.recommended_split?.buyer_refund_bps ?? 0,
                    sellerPayoutBps: dispute.recommended_split?.seller_payout_bps ?? 10000,
                    summary: dispute.recommended_split?.summary,
                    rationale: dispute.recommended_split?.rationale,
                    hamming: dispute.hamming_distance_phash,
                    freezeRemainingSec: dispute.freeze_remaining_sec,
                    canResolve: Boolean(arbJwt),
                  }}
                  onAction={judge.run}
                />
              ) : (
                <p className="text-[13.5px] text-ink-3">No open dispute. When either party raises one, the channel freezes and the AI tribunal recommendation appears here.</p>
              )}
              {judge.notice ? <div className="mt-2"><Banner tone="ok">{judge.notice}</Banner></div> : null}
              {judge.error ? <div className="mt-2"><Banner tone="danger">{judge.error}</Banner></div> : null}
            </div>
            <div>
              <h3 className="mb-2 text-[14px] font-medium text-ink">Session log</h3>
              <ol className="num space-y-1 text-[11.5px] text-ink-2">
                {log.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
              <div className="num mt-3 space-y-0.5 text-[11.5px] text-ink-3">
                <div>buyer {prov?.buyer_session.nexconn_user_id} · token {prov?.buyer_session.access_token?.slice(0, 14)}…</div>
                <div>seller {prov?.seller_session.nexconn_user_id} · token {prov?.seller_session.access_token?.slice(0, 14)}…</div>
              </div>
            </div>
            <VoucherChain deal={deal} />
          </aside>
        </div>
      )}
    </div>
  );
}
