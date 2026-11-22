import { motion } from "motion/react";
import { FadeUp } from "../motion/FadeUp";
import { ease, useReducedMotion } from "../motion/hooks";
import { Eyebrow } from "../ui/Eyebrow";

interface NexconnFeatureCard {
  badge: string;
  sdk: string;
  title: string;
  points: string[];
}

const NEXCONN_CARDS: NexconnFeatureCard[] = [
  {
    badge: "01 · UI LAYER",
    sdk: "@nexconn/chatui@26.2.5",
    title: "custom lit v3 deal cards",
    points: [
      "Four custom message types registered before app.ready().",
      "Escrow, bilingual bubble, assay receipt & tribunal verdict cards.",
      "Card actions leave the Shadow DOM as one composed event.",
    ],
  },
  {
    badge: "02 · REALTIME CORE",
    sdk: "@nexconn/chat · @nexconn/engine@26.2.1",
    title: "browser connects with a server token",
    points: [
      "NCEngine.initialize, then NCEngine.connect over WebSocket.",
      "A message handler logs RC:StreamMsg arrivals in /sandbox.",
      "Direct & Group deal rooms; Open & Community via the server API.",
    ],
  },
  {
    badge: "03 · CALL SDK",
    sdk: "@nexconn/call@26.2.1 · NCCallEngine",
    title: "1:1 inspection video call",
    points: [
      "NCCallEngine.install before NCEngine.initialize; startCall / acceptCall buyer to seller.",
      "The buyer's loupe fingerprints the seller video received over the call.",
      "Frames and audio verified by Rust pHash & a 4096-pt FFT.",
    ],
  },
  {
    badge: "04 · SERVER AUTHORITY",
    sdk: "@nexconn/server-sdk@0.1.2 (vendored)",
    title: "tokens, ai streaming & freeze",
    points: [
      "Access tokens issued by the bridge, never the browser.",
      "Streams Gemini translations via RC:StreamMsg.",
      "addGroupChannelFreezeList locks the deal room for 90 seconds.",
    ],
  },
  {
    badge: "05 · SYSTEM LEDGER",
    sdk: "SystemMessagesApi · Ed25519",
    title: "signed escrow vouchers",
    points: [
      "Rust signs every escrow milestone with Ed25519.",
      "Each voucher hash-chains to the one before it.",
      "Sent to the Nexconn System channel by the bridge.",
    ],
  },
  {
    badge: "06 · PRIVACY GUARD",
    sdk: "Rust regex scrubber · DPDP Act",
    title: "pii removed before any ai call",
    points: [
      "Aadhaar, PAN, phone, UPI & email stripped from every prompt.",
      "Falls back to a Node scrubber if Rust doesn't answer in time.",
      "Gemini never sees the raw identifiers.",
    ],
  },
];

const METHODOLOGY_BLOCKS = [
  {
    step: "01. PROBLEM & IDEA",
    heading: "Zero-Fraud Cross-Language P2P & B2B Escrow",
    points: [
      "Solves two-sided trust deficit in campus second-hand & B2B wholesale trade.",
      "Bridges Hindi, Tamil, Marathi & English inside one verifiable chat room.",
      "Replaces blind UPI transfers with camera-verified milestone releases.",
    ],
  },
  {
    step: "02. 4-STAGE METHODOLOGY",
    heading: "Chat → Lock → Live Assay → Settle or Freeze",
    points: [
      "Stage 1: a Rust regex scrubber removes PII; Gemini translates into both scripts.",
      "Stage 2: Go 1.24 8-state escrow FSM locks funds with optimistic version checks.",
      "Stage 3: locally captured inspection video verified via 64-bit DCT pHash & 4096-pt FFT.",
      "Stage 4: Ed25519 hash-chained voucher; a dispute triggers the 90s freeze tribunal.",
    ],
  },
  {
    step: "03. NEXCONN SDK & CHANNELS",
    heading: "4 Web SDK Packages + Server SDK",
    points: [
      "Web: @nexconn/engine, @nexconn/chat, @nexconn/chatui, @nexconn/call.",
      "Server: vendored @nexconn/server-sdk 0.1.2 for tokens, streams, freeze, Open, Community & System.",
      "Messages: RC:StreamMsg AI streaming + 4 custom Lit message types.",
    ],
  },
  {
    step: "04. POLYGLOT STACK",
    heading: "Go 1.24 · Rust 1.85 · Node.js 22 · React 19 · Android",
    points: [
      "Go Deal Engine (:4002): 8-state FSM, idempotency keys, expected_version checks, SSE.",
      "Rust Verifier (:4003): PII scrub, pHash assay, FFT motor check, Ed25519 signing.",
      "Node Bridge (:4001): vendored Nexconn server SDK, Gemini, rule-based fallbacks.",
      "Clients: React 19 web app & Android companion APK (v1.0.0).",
    ],
  },
] as const;

function NexconnLogoMark() {
  return (
    <div className="inline-flex items-center gap-3 px-3.5 py-2" style={{ border: "1px solid #3d3d3d" }}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="11" cy="16" r="6.5" stroke="#e5fe40" strokeWidth="2.2" />
        <circle cx="21" cy="16" r="6.5" stroke="#ffffff" strokeWidth="2.2" />
        <circle cx="25.5" cy="9.5" r="2.2" fill="#e5fe40" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-fg">
          NEXCONN // CONSOLE
        </span>
        <span className="font-mono text-[10px] text-muted">
          singapore cluster · n19jmcy5nw379
        </span>
      </div>
    </div>
  );
}

export function S8TrustBand() {
  const reduced = Boolean(useReducedMotion());

  return (
    <section
      id="nexconn-architecture"
      aria-label="Nexconn Platform Architecture and Project Methodology"
      className="w-full bg-pop-black py-[84px] md:py-[132px] px-4 sm:px-6 md:px-10"
      style={{
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* Part 1: Nexconn Feature Showcase */}
        <FadeUp className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow dot>POWERED BY NEXCONN UNIFIED COMMUNICATIONS</Eyebrow>
            <h2 className="t-h1 mt-4 lowercase text-fg max-w-[680px]">
              why nexconn powers every millisecond of mudra.
            </h2>
            <p className="t-lead mt-3 max-w-[580px] lowercase text-fg-2">
              chat, custom ui cards, webrtc sfu calls, s3 media, and streaming ai — all from one sdk stack.
            </p>
          </div>
          <a
            href="https://console.nexconn.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline hover:opacity-90 transition-opacity"
          >
            <NexconnLogoMark />
          </a>
        </FadeUp>

        <div className="mt-10 sm:mt-12 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {NEXCONN_CARDS.map((card, idx) => (
            <motion.article
              key={card.sdk}
              initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{
                duration: 0.45,
                delay: reduced ? 0 : idx * 0.05,
                ease: ease.expoOut,
              }}
              whileHover={reduced ? undefined : { y: -4 }}
              className="group relative flex flex-col bg-pop-void p-5 sm:p-6 transition-colors duration-200 break-words"
              style={{ border: "1px solid var(--hairline)" }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] origin-left scale-x-0 bg-neo-paccha transition-transform duration-300 ease-out group-hover:scale-x-100"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] font-semibold tracking-[0.16em] text-neo-paccha">
                  {card.badge}
                </span>
                <span className="inline-block size-[6px] bg-dim group-hover:bg-neo-paccha transition-colors" />
              </div>

              <div className="mt-1.5 font-mono text-[11.5px] text-muted">
                {card.sdk}
              </div>

              <h3 className="mt-2.5 text-[17px] font-bold lowercase leading-snug text-fg">
                {card.title}
              </h3>

              <ul className="mt-3 flex flex-col gap-2 list-none p-0 m-0 text-[13px] leading-snug text-fg-2">
                {card.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-[6px] size-[4px] shrink-0 bg-neo-paccha" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        {/* Part 2: Crisp Point-Wise Methodology */}
        <div
          id="methodology"
          className="mt-16 pt-14"
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <FadeUp>
            <Eyebrow dot>METHODOLOGY & SYSTEM SPECIFICATION</Eyebrow>
            <h2 className="t-h2 mt-3 lowercase text-fg">
              what we built, how it works, and exact stack.
            </h2>
          </FadeUp>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {METHODOLOGY_BLOCKS.map((item) => (
              <article
                key={item.step}
                className="bg-pop-void p-5 sm:p-6"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <div className="font-mono text-[11px] font-semibold tracking-[0.14em] text-neo-paccha">
                  {item.step}
                </div>
                <h3 className="mt-1.5 text-[16px] font-bold text-fg">
                  {item.heading}
                </h3>
                <ul className="mt-3 flex flex-col gap-2 list-none p-0 m-0 text-[13px] leading-snug text-fg-2">
                  {item.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-[6px] size-[4px] shrink-0 bg-dim" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
