import { useEffect, useState } from "react";
import { Page, SectionTitle, Stat, Banner } from "../components/Chrome";
import { api, errorText } from "../lib/api";

interface Telemetry {
  app_key_masked?: string;
  verified_connected_maus?: number;
  active_channels_by_type?: Record<string, number>;
  latency_p99_ms?: Record<string, number>;
  total_escrow_vouchers_signed?: number;
  live_counts?: Record<string, number>;
  [k: string]: unknown;
}

export default function Traction() {
  const [t, setT] = useState<Telemetry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const load = () =>
      api
        .get<Telemetry>("/api/v1/traction/telemetry")
        .then((r) => {
          setT(r);
          setErr(null);
          setUpdated(new Date());
        })
        .catch((e) => setErr(errorText(e)));
    void load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  const ch = t?.active_channels_by_type ?? {};
  const lat = t?.latency_p99_ms ?? {};

  return (
    <Page>
      <SectionTitle
        title="Traction and latency ledger"
        sub="Read straight from the Go deal engine (API-18), refreshed every 5 seconds. Live counts come from this running instance; MAU should be cross-checked against console.nexconn.ai."
      />
      {err ? <div className="mb-4"><Banner tone="danger">{err}</Banner></div> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Nexconn users with issued tokens" value={t?.verified_connected_maus?.toLocaleString("en-IN") ?? "-"} hint={t?.app_key_masked ? `App key ${t.app_key_masked}` : undefined} />
        <Stat label="Signed escrow vouchers" value={t?.total_escrow_vouchers_signed?.toLocaleString("en-IN") ?? "-"} hint="Ed25519, hash-chained per deal" />
        <Stat label="Go FSM transition p99" value={lat.go_escrow_fsm_ms != null ? `${lat.go_escrow_fsm_ms.toFixed(3)} ms` : "-"} hint="Measured in-process per transition" />
        <Stat label="Assay pHash p99 (Rust or Go fallback)" value={lat.rust_phash_assay_ms != null ? `${lat.rust_phash_assay_ms.toFixed(2)} ms` : "-"} hint={lat.rust_pii_scrub_ms != null ? `PII scrub p99 ${lat.rust_pii_scrub_ms.toFixed(2)} ms` : undefined} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border hairline bg-paper p-5">
          <h2 className="text-[16px] font-medium text-ink">Channels by type</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead>
              <tr className="text-left text-[13px] text-ink-3">
                <th className="py-1.5 font-normal">Channel type</th>
                <th className="py-1.5 text-right font-normal">Active</th>
              </tr>
            </thead>
            <tbody>
              {["direct", "group", "community", "open", "system"].map((k) => (
                <tr key={k} className="border-t hairline">
                  <td className="py-2 capitalize text-ink-2">{k}</td>
                  <td className="num py-2 text-right text-ink">{ch[k] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-xl border hairline bg-paper p-5">
          <h2 className="text-[16px] font-medium text-ink">This instance since start</h2>
          {t?.live_counts ? (
            <table className="mt-3 w-full text-[14px]">
              <tbody>
                {Object.entries(t.live_counts).filter(([, v]) => typeof v !== "object").map(([k, v]) => (
                  <tr key={k} className="border-t hairline">
                    <td className="py-2 text-ink-2">{k.replace(/_/g, " ")}</td>
                    <td className="num py-2 text-right text-ink">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-[14px] text-ink-3">No live counters reported.</p>
          )}
          <p className="mt-3 text-[12.5px] text-ink-3">{updated ? `Updated ${updated.toLocaleTimeString()}` : ""}</p>
        </section>
      </div>
    </Page>
  );
}
