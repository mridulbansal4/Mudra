import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@heroui/react";
import { formatInr } from "@mudra/shared-types";
import { Page, SectionTitle, Banner } from "../components/Chrome";
import { api, errorText } from "../lib/api";

interface StartResp {
  run_id: string;
  nexconn_direct_channel_id: string;
  nexconn_access_token: string;
  sticker_price_paise: number;
  duration_sec: number;
  ends_at: string;
  item_title?: string;
}
interface BidResp {
  run_id: string;
  deal_closed: boolean;
  counter_offer_paise: number;
  savings_bps?: number;
  reply_text?: string;
  expired?: boolean;
}
interface Line {
  who: "you" | "chanakya";
  text: string;
  price?: number;
}

const ITEMS = [
  { sku: "THINKPAD_X1_GEN10", label: "Refurbished ThinkPad X1 Carbon Gen 10" },
  { sku: "MACBOOK_AIR_M2", label: "Refurbished MacBook Air M2" },
  { sku: "RTX_3080", label: "Used RTX 3080 graphics card" },
];

export default function Arena() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [sku, setSku] = useState(ITEMS[0].sku);
  const [run, setRun] = useState<StartResp | null>(null);
  const [left, setLeft] = useState(60);
  const [offer, setOffer] = useState("");
  const [msg, setMsg] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [result, setResult] = useState<BidResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!run || result?.deal_closed) return;
    const end = new Date(run.ends_at).getTime();
    const id = window.setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 250);
    return () => window.clearInterval(id);
  }, [run, result?.deal_closed]);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [lines.length]);

  const start = async () => {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await api.post<StartResp>("/api/v1/arena/start", { challenger_name: name.trim() || "Guest trader", preferred_locale: "en-IN", item_sku: sku });
      setRun(r);
      setLeft(r.duration_sec);
      setOffer(String(Math.round((r.sticker_price_paise * 0.8) / 100)));
      setLines([{ who: "chanakya", text: `Welcome. The ${r.item_title ?? ITEMS.find((i) => i.sku === sku)?.label} is ${formatInr(r.sticker_price_paise)}. Make me an offer, quickly.`, price: r.sticker_price_paise }]);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const bid = async () => {
    if (!run) return;
    const rupees = Number(offer.replace(/[^\d]/g, ""));
    if (!rupees) return setErr("Enter an offer in rupees");
    setBusy(true);
    setErr(null);
    const text = msg.trim() || `I'll pay ${formatInr(rupees * 100)} right now with escrow.`;
    setLines((l) => [...l, { who: "you", text, price: rupees * 100 }]);
    setMsg("");
    try {
      const r = await api.post<BidResp>(`/api/v1/arena/${run.run_id}/bid`, { offered_amount_paise: rupees * 100, message_text: text, locale: "en-IN" });
      setLines((l) => [...l, { who: "chanakya", text: r.reply_text ?? (r.deal_closed ? "Done. You drive a hard bargain." : `I can do ${formatInr(r.counter_offer_paise)}.`), price: r.counter_offer_paise }]);
      if (r.deal_closed || r.expired) setResult(r);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const over = run && (left === 0 || result);
  const savings = result && run ? (1 - result.counter_offer_paise / run.sticker_price_paise) * 100 : 0;

  return (
    <Page>
      <SectionTitle title="60-second bargain arena" sub="Haggle with the Chanakya shopkeeper over a Nexconn Direct channel. The floor price drops as the clock runs, so timing matters." />
      {err ? <div className="mb-4"><Banner tone="danger">{err}</Banner></div> : null}
      {!run ? (
        <div className="max-w-[560px] space-y-4 rounded-[20px] border hairline bg-paper p-6">
          <label className="block">
            <span className="text-[13.5px] text-ink-2">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Mehta" className="mt-1 w-full rounded-lg border hairline bg-paper px-3 py-2 text-[15px] text-ink outline-none focus:border-seal" />
          </label>
          <fieldset>
            <legend className="text-[13.5px] text-ink-2">Item</legend>
            <div className="mt-1 space-y-1.5">
              {ITEMS.map((i) => (
                <label key={i.sku} className="flex items-center gap-2 text-[14.5px] text-ink">
                  <input type="radio" checked={sku === i.sku} onChange={() => setSku(i.sku)} className="accent-[var(--accent)]" />
                  {i.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Button variant="primary" isDisabled={busy} onPress={() => void start()}>
            {busy ? "Issuing your Nexconn token" : "Start the 60-second duel"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex h-[min(640px,70dvh)] flex-col rounded-[20px] border hairline bg-paper">
            <div className="flex items-baseline justify-between border-b hairline px-5 py-3">
              <span className="text-[14px] text-ink-2">
                Direct channel <span className="num">{run.nexconn_direct_channel_id}</span>
              </span>
              <span className={`num text-[22px] ${left <= 10 ? "text-freeze" : "text-ink"}`}>00:{String(left).padStart(2, "0")}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((l, i) => (
                <div key={i} className={`fade-in flex ${l.who === "you" ? "justify-end" : ""}`}>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2 text-[14.5px] ${l.who === "you" ? "bg-seal text-seal-ink" : "bg-well text-ink"}`}>{l.text}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {!over ? (
              <form
                className="flex flex-wrap gap-2 border-t hairline px-5 py-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void bid();
                }}
              >
                <label className="flex items-center gap-1 rounded-lg border hairline bg-paper px-3">
                  <span className="text-ink-3">₹</span>
                  <input value={offer} onChange={(e) => setOffer(e.target.value)} inputMode="numeric" aria-label="Offer in rupees" className="num w-28 bg-transparent py-2 text-[15px] text-ink outline-none" />
                </label>
                <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Add a line to persuade him" className="min-w-0 flex-1 rounded-lg border hairline bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-seal" />
                <Button type="submit" variant="primary" isDisabled={busy}>
                  Offer
                </Button>
              </form>
            ) : null}
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border hairline bg-paper p-5">
              <div className="text-[13px] text-ink-3">Sticker price</div>
              <div className="num text-[22px] text-ink">{formatInr(run.sticker_price_paise)}</div>
              <div className="mt-3 text-[13px] text-ink-3">Your last offer</div>
              <div className="num text-[18px] text-ink">{offer ? formatInr(Number(offer.replace(/[^\d]/g, "")) * 100) : "-"}</div>
            </div>
            {over ? (
              <div className="rounded-xl border hairline bg-paper p-5">
                <div className="text-[17px] font-medium text-ink">{result?.deal_closed ? "Deal closed" : "Time is up"}</div>
                {result?.deal_closed ? (
                  <p className="mt-1 text-[14px] text-ink-2">
                    You paid <span className="num">{formatInr(result.counter_offer_paise)}</span>, <span className="num">{savings.toFixed(1)}%</span> under sticker.
                  </p>
                ) : (
                  <p className="mt-1 text-[14px] text-ink-2">The shopkeeper held his price. Try again and open lower.</p>
                )}
                <p className="num mt-2 break-all text-[11.5px] text-ink-3">Nexconn token {run.nexconn_access_token.slice(0, 18)}…</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="primary" onPress={() => nav("/sandbox")}>
                    Open a real escrow room
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => window.open(`https://wa.me/?text=${encodeURIComponent(`I bargained ${savings.toFixed(1)}% off in the MUDRA arena. Beat me: ${location.origin}/arena`)}`, "_blank")}
                  >
                    Share on WhatsApp
                  </Button>
                  <Button variant="ghost" onPress={() => setRun(null)}>
                    Play again
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </Page>
  );
}
