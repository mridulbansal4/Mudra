import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@heroui/react";
import { TopNav } from "../components/Chrome";
import { LitCard } from "../components/LitCard";
import { api } from "../lib/api";

interface Telemetry {
  verified_connected_maus?: number;
  total_escrow_vouchers_signed?: number;
  latency_p99_ms?: { go_escrow_fsm_ms?: number; rust_pii_scrub_ms?: number; rust_phash_assay_ms?: number };
}

const previewCard = {
  dealId: "preview",
  title: "Juki MO-6814S overlock machine",
  amountPaise: 14500000,
  fsmState: "FUNDED",
  version: 2,
  allowedActions: ["START_ASSAY", "RAISE_DISPUTE"],
  voucher: { voucher_type: "ESCROW_LOCKED", curr_voucher_sha256: "8f9a2c1b77e40192837465544332211", ed25519_signature: "4a8b9c0d1e2f3a4b5c6d7e8f9a0b2c1b" },
};

const previewBubble = {
  senderName: "Rajesh Natarajan",
  sourceLocale: "ta-IN",
  targetLocale: "hi-IN",
  rawText: "நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM சோதனை தேவை",
  translatedText: "मैं ₹1,45,000 में खरीदने को तैयार हूँ, मोटर 4800 RPM की जाँच चाहिए",
  terms: { offered_amount_paise: 14500000, required_rpm: 4800 },
};

const CHAPTERS = [
  {
    n: "01",
    title: "Chat trade breaks at three points",
    body: "Language: a Tamil buyer and a Hindi seller can't settle warranty terms. Trust: nobody wants to pay or ship first. Proof: static photos are easy to fake, and support tickets take two weeks.",
  },
  {
    n: "02",
    title: "Four stages inside one Nexconn channel",
    body: "Negotiate with live translation, lock escrow through a version-checked Go state machine, verify the item over live video with Rust frame hashing and motor-audio FFT, then release or freeze the room for a 90-second tribunal.",
  },
  {
    n: "03",
    title: "Every step leaves a signed receipt",
    body: "Each transition writes an Ed25519-signed, hash-chained voucher to the read-only System channel, so either party can prove what was agreed and when.",
  },
];

const DOORS = [
  { to: "/sandbox", title: "Judge sandbox", body: "Buyer, seller and tribunal side by side. No sign-in." },
  { to: "/auth", title: "MSME buyer or dealer", body: "Step into Rajesh or Vikram with one tap." },
  { to: "/arena", title: "Campus bargain arena", body: "60 seconds to talk down the Chanakya shopkeeper." },
  { to: "/dispatch", title: "Arbitrator desk", body: "Frozen channels, evidence diff and split execution." },
];

export default function Landing() {
  const nav = useNavigate();
  const [t, setT] = useState<Telemetry | null>(null);
  useEffect(() => {
    api.get<Telemetry>("/api/v1/traction/telemetry").then(setT).catch(() => setT(null));
  }, []);

  return (
    <div className="min-h-dvh bg-canvas">
      <TopNav />
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <section className="grid min-h-[calc(100dvh-56px)] grid-cols-1 items-center gap-10 py-10 lg:grid-cols-12 lg:py-0">
          <div className="lg:col-span-5">
            <h1 className="display text-[clamp(2.25rem,4vw,3.5rem)] text-ink">Trade across languages. Verify on live video.</h1>
            <p className="mt-5 max-w-[46ch] text-[17px] text-ink-2">
              Negotiate in Tamil or Hindi, inspect goods on camera, and settle escrow inside one Nexconn chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="primary" onPress={() => nav("/sandbox")}>
                Launch 1-click split-screen demo
              </Button>
              <Button size="lg" variant="outline" onPress={() => nav("/auth")}>
                Sign in or create account
              </Button>
            </div>
            <p className="mt-6 text-[13px] text-ink-3">Built on Nexconn ChatUI, Chat, Call and the v4 server API</p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-[20px] border hairline bg-well p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1 text-[12.5px] text-ink-3">
                <span>Deal #8821 · Group channel preview</span>
                <span className="num">ta-IN to hi-IN</span>
              </div>
              <div className="space-y-3">
                <LitCard tag="nc-bilingual-bubble" data={previewBubble} />
                <LitCard tag="nc-escrow-deal-card" data={previewCard} viewerRole="buyer" onAction={() => nav("/sandbox")} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-x-12 gap-y-10 border-t hairline py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <h2 className="text-[28px] font-medium leading-[1.18] tracking-[-0.015em] text-ink">How a deal moves</h2>
          <ol className="space-y-8">
            {CHAPTERS.map((c) => (
              <li key={c.n} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
                <span className="num text-[14px] text-seal">{c.n}</span>
                <div>
                  <h3 className="text-[20px] font-medium text-ink">{c.title}</h3>
                  <p className="mt-2 max-w-[62ch] text-[15.5px] text-ink-2">{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t hairline py-16">
          <h2 className="mb-6 text-[28px] font-medium leading-[1.18] tracking-[-0.015em] text-ink">Pick a door</h2>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border hairline bg-hair sm:grid-cols-2">
            {DOORS.map((d) => (
              <Link key={d.to} to={d.to} className="press block bg-paper p-6 no-underline hover:bg-well">
                <div className="text-[17px] font-medium text-ink">{d.title}</div>
                <div className="mt-1 text-[14.5px] text-ink-2">{d.body}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t hairline py-12">
          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3 text-[14px] text-ink-2">
            <span className="text-ink-3">Live from the deal engine</span>
            {t ? (
              <>
                <span>
                  Go FSM p99 <span className="num text-ink">{t.latency_p99_ms?.go_escrow_fsm_ms?.toFixed(3) ?? "—"} ms</span>
                </span>
                <span>
                  Vouchers signed <span className="num text-ink">{t.total_escrow_vouchers_signed ?? 0}</span>
                </span>
                <Link to="/traction" className="text-seal">
                  Open traction ledger
                </Link>
              </>
            ) : (
              <span>Deal engine offline. Run pnpm dev to start the services.</span>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t hairline">
        <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-8 gap-y-2 px-4 py-8 text-[13px] text-ink-3 sm:px-6">
          <span>SAMADHAN-OS, Team Chanakya, Nexconn Build Challenge 2026</span>
          <Link to="/guide" className="text-ink-3">SDK guide</Link>
          <Link to="/traction" className="text-ink-3">Telemetry</Link>
          <span>MIT licence</span>
        </div>
      </footer>
    </div>
  );
}
