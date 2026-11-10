import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import type { DisputeView, FsmState } from "@samadhan/shared-types";
import { formatInr } from "@samadhan/shared-types";
import { Page, SectionTitle, Banner } from "../components/Chrome";
import { LitCard } from "../components/LitCard";
import { VoucherChain, useDealActions } from "../components/DealRoom";
import { api, errorText } from "../lib/api";
import { useLiveDeal } from "../lib/deal";
import { useSession } from "../lib/session";
import { signIn } from "../lib/personas";

export default function Dispatch() {
  const s = useSession();
  const [jwt, setJwt] = useState<string | undefined>(s?.role === "arbitrator" ? s.jwt : undefined);
  const [queue, setQueue] = useState<DisputeView[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (jwt) return;
    signIn({ preset: "P-04_MEERA", displayName: "Meera Krishnan", role: "arbitrator", locale: "en-IN" }, false)
      .then((x) => setJwt(x.jwt))
      .catch((e) => setErr(errorText(e)));
  }, [jwt]);

  const load = useCallback(async () => {
    if (!jwt) return;
    try {
      const r = await api.get<{ disputes: DisputeView[] }>("/api/v1/dispatch/queue", jwt);
      const list = (r.disputes ?? []).sort((a, b) => (b.amount_paise ?? 0) - (a.amount_paise ?? 0));
      setQueue(list);
      setErr(null);
      setSel((cur) => cur ?? list[0]?.deal_id ?? null);
    } catch (e) {
      setErr(errorText(e));
    }
  }, [jwt]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [load]);

  const { deal, refresh } = useLiveDeal(sel ?? undefined, jwt);
  const actions = useDealActions(deal, jwt, async () => {
    await refresh();
    await load();
  });
  const d = deal?.dispute;
  const frozen = (deal?.escrow_contract.fsm_state as FsmState | undefined) === "DISPUTED_FROZEN";
  const preHash = [...(deal?.assay_logs ?? [])].reverse().find((a) => a.frame_phash_hex)?.frame_phash_hex;

  return (
    <Page wide>
      <SectionTitle title="Arbitrator dispatch" sub="Frozen Group channels, sorted by escrow value. Review the forensic diff and execute a binding split." />
      {err ? <div className="mb-4"><Banner tone="danger">{err}</Banner></div> : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside aria-label="Dispute queue">
          <h2 className="mb-2 text-[14px] font-medium text-ink">Queue</h2>
          {queue.length === 0 ? (
            <p className="text-[13.5px] text-ink-3">No frozen channels. Raise a dispute from the sandbox to see one arrive here.</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((q) => (
                <li key={q.dispute_id}>
                  <button
                    onClick={() => setSel(q.deal_id)}
                    className={`press w-full rounded-xl border px-3 py-2.5 text-left ${sel === q.deal_id ? "border-seal bg-paper" : "hairline bg-paper/60"}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-[14px] text-ink">{q.deal_title ?? q.deal_id}</span>
                      <span className="num shrink-0 text-[13px] text-ink">{q.amount_paise ? formatInr(q.amount_paise) : ""}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-[12px] text-ink-3">
                      <span>{q.reason_code}</span>
                      <span className="num">{q.status === "RESOLVED" ? "resolved" : `${q.freeze_remaining_sec ?? 0}s freeze`}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          {deal && d ? (
            <>
              <div className="rounded-xl border hairline bg-paper p-5">
                <div className="text-[16px] font-medium text-ink">{deal.title}</div>
                <p className="mt-1 text-[14px] text-ink-2">{d.description}</p>
                <div className="num mt-2 text-[12.5px] text-ink-3">
                  {d.dispute_id} · channel {deal.nexconn_channel_id} · escrow v{deal.escrow_contract.version}
                </div>
              </div>
              <LitCard
                tag="nc-tribunal-verdict"
                data={{
                  disputeId: d.dispute_id,
                  amountPaise: deal.escrow_contract.amount_paise,
                  buyerRefundBps: d.recommended_split?.buyer_refund_bps ?? 0,
                  sellerPayoutBps: d.recommended_split?.seller_payout_bps ?? 10000,
                  summary: d.recommended_split?.summary,
                  rationale: d.recommended_split?.rationale,
                  hamming: d.hamming_distance_phash,
                  freezeRemainingSec: d.freeze_remaining_sec,
                  resolved: !frozen,
                  canResolve: frozen,
                }}
                onAction={actions.run}
              />
              {actions.notice ? <Banner tone="ok">{actions.notice}</Banner> : null}
              {actions.error ? <Banner tone="danger">{actions.error}</Banner> : null}
              {frozen ? (
                <div className="flex gap-2">
                  <Button variant="danger" isDisabled={actions.busy} onPress={() => void actions.run({ action: "REFUND_BUYER" })}>
                    Refund buyer in full
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-[14px] text-ink-3">Select a dispute from the queue.</p>
          )}
        </section>

        <aside className="space-y-6" aria-label="Forensic comparison">
          {deal && d ? (
            <>
              <div className="rounded-xl border hairline bg-paper p-5">
                <h3 className="text-[14px] font-medium text-ink">Forensic comparison</h3>
                <dl className="num mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12.5px]">
                  <dt className="text-ink-3">Pre-shipment pHash</dt>
                  <dd className="break-all text-ink">{preHash ?? "—"}</dd>
                  <dt className="text-ink-3">Post-delivery pHash</dt>
                  <dd className="break-all text-ink">{(d.post_delivery_phash_hex as string | undefined) ?? "—"}</dd>
                  <dt className="text-ink-3">Hamming distance</dt>
                  <dd className="text-ink">{d.hamming_distance_phash ?? "—"} / 64</dd>
                  <dt className="text-ink-3">Motor RPM at assay</dt>
                  <dd className="text-ink">{Math.round(Number([...(deal.assay_logs ?? [])].reverse().find((a) => a.audio_fft_rpm_peak)?.audio_fft_rpm_peak ?? 0)).toLocaleString("en-IN") || "—"}</dd>
                </dl>
              </div>
              <VoucherChain deal={deal} />
            </>
          ) : null}
        </aside>
      </div>
    </Page>
  );
}
