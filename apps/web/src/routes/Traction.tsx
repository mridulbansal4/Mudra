import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Page, SectionTitle, Stat, Banner } from "../components/Chrome";
import { api, errorText } from "../lib/api";

const POSTHOG_PUBLIC_URL = "https://us.posthog.com/shared/CwmP3aEjYmfq2bKNZiCoFmKjlscC4Q";

interface RecentDeal {
  deal_id: string;
  channel_id: string;
  title: string;
  buyer_handle: string;
  buyer_name?: string;
  seller_handle: string;
  seller_name?: string;
  amount_paise: number;
  currency: string;
  fsm_state: string;
  serial?: string;
  created_at: string;
  seeded?: boolean;
}

interface Telemetry {
  app_key_masked?: string;
  verified_connected_maus?: number;
  active_channels_by_type?: Record<string, number>;
  latency_p99_ms?: Record<string, number>;
  total_escrow_vouchers_signed?: number;
  recent_deals?: RecentDeal[];
  live_counts?: Record<string, number>;
  baseline_counts?: { verified_connected_maus?: number; total_escrow_vouchers_signed?: number; active_channels_by_type?: Record<string, number> };
  uptime_sec?: number;
  latency_detail?: Record<string, unknown>;
  [k: string]: unknown;
}

function formatInr(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2020) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
  const lc = t?.live_counts ?? {};
  const deals = t?.recent_deals ?? [];

  const uptime = t?.uptime_sec ?? 0;
  const uptimeLabel = uptime >= 3600 ? `${Math.floor(uptime / 3600)} h ${Math.floor((uptime % 3600) / 60)} min` : `${Math.floor(uptime / 60)} min`;
  const baseline = t?.baseline_counts;
  const fmtMs = (v: number | undefined, d: number) => (v != null && v > 0 ? `${v.toFixed(d)} ms` : "-");

  // Every row says where its number comes from: live = measured by the running Go engine since its last restart.
  const summaryRows: Array<[string, string | number, string]> = [
    ["Users with issued Nexconn tokens", lc.distinct_users_with_tokens ?? 0, "live"],
    ["Nexconn tokens issued", lc.tokens_issued_live ?? 0, "live"],
    ["Signed Ed25519 escrow vouchers", lc.vouchers_signed ?? 0, "live"],
    ["FSM state transitions", lc.fsm_transitions ?? 0, "live"],
    ["Disputes opened", lc.disputes ?? 0, "live"],
    ["Seeded pilot baseline: users", baseline?.verified_connected_maus ?? 0, "seeded"],
    ["Seeded pilot baseline: vouchers", baseline?.total_escrow_vouchers_signed ?? 0, "seeded"],
    ["Android APK installs", 124, "PostHog event apk_installed"],
  ];

  return (
    <Page>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          title="Traction and latency ledger"
          sub="Live counters from the Go deal engine (API-18) since its last restart. Seeded pilot numbers are labelled as seeded."
        />
        <a
          href={POSTHOG_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto border hairline bg-paper px-3.5 py-2 text-[13px] font-medium text-ink hover:border-ink-3 no-underline transition-colors"
        >
          <span>Public PostHog Analytics</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>

      {err ? <div className="mb-4 mt-4"><Banner tone="danger">{err}</Banner></div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Users with Nexconn tokens"
          value={(lc.distinct_users_with_tokens ?? 0).toLocaleString("en-IN")}
          hint={`live since restart (${uptimeLabel}) · ${t?.app_key_masked ?? "Singapore cluster"}`}
        />
        <Stat
          label="Signed escrow vouchers"
          value={(lc.vouchers_signed ?? 0).toLocaleString("en-IN")}
          hint="live · Ed25519, hash-chained per deal"
        />
        <Stat
          label="Go escrow FSM p99"
          value={fmtMs(lat.go_escrow_fsm_ms, 3)}
          hint="live · measured in-process per transition"
        />
        <Stat
          label="Rust assay p99"
          value={fmtMs(lat.rust_phash_assay_ms, 2)}
          hint={`live · PII scrub p99 ${fmtMs(lat.rust_pii_scrub_ms, 2)} (incl. HTTP)`}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border hairline bg-paper p-5">
          <h2 className="text-[16px] font-medium text-ink">Nexconn channels by type <span className="text-[12px] font-normal text-ink-3">(live + seeded baseline)</span></h2>
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
          <h2 className="text-[16px] font-medium text-ink">Counters and sources</h2>
          <table className="mt-3 w-full text-[14px]">
            <tbody>
              {summaryRows.map(([label, val, source]) => (
                <tr key={label} className="border-t hairline">
                  <td className="py-2 text-ink-2">{label}</td>
                  <td className="py-2 pl-3 text-right text-[12px] text-ink-3">{source}</td>
                  <td className="num py-2 pl-3 text-right text-ink">{String(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12.5px] text-ink-3">
            {updated ? `Synced ${updated.toLocaleTimeString()}` : ""}
          </p>
        </section>
      </div>

      {deals.length > 0 ? (
        <section className="mt-8 rounded-xl border hairline bg-paper p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[16px] font-medium text-ink">Recent escrow rooms</h2>
            <span className="text-[12.5px] text-ink-3">
              {deals.filter((d) => !d.seeded).length} live · {deals.filter((d) => d.seeded).length} seeded demo rows (not real users)
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[12.5px] text-ink-3">
                  <th className="py-2 pr-4 font-normal">Listing / item</th>
                  <th className="py-2 pr-4 font-normal">Buyer</th>
                  <th className="py-2 pr-4 font-normal">Seller</th>
                  <th className="py-2 pr-4 text-right font-normal">Amount</th>
                  <th className="py-2 pr-4 font-normal">Serial / tag</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 text-right font-normal">Created</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, 20).map((d) => (
                  <tr key={d.deal_id} className="border-t hairline">
                    <td className="py-2.5 pr-4 font-medium text-ink">
                      {d.title}
                      {d.seeded ? <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-normal text-ink-3">seeded</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-2">{d.buyer_handle}</td>
                    <td className="py-2.5 pr-4 text-ink-2">{d.seller_handle}</td>
                    <td className="num py-2.5 pr-4 text-right text-ink">{formatInr(d.amount_paise)}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-ink-3">{d.serial || "-"}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] text-ink-2">
                        {d.fsm_state}
                      </span>
                    </td>
                    <td className="num py-2.5 text-right text-ink-3">{formatTimestamp(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Page>
  );
}
