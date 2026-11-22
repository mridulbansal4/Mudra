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
      "Eliminated custom chat-scroll & state boilerplate.",
      "Registers <nc-escrow-deal-card> & <nc-bilingual-bubble> inline.",
      "Renders 8-state escrow actions inside the chat timeline.",
    ],
  },
  {
    badge: "02 · REALTIME CORE",
    sdk: "@nexconn/chat · @nexconn/engine@26.2.1",
    title: "all 5 channel types in one sdk",
    points: [
      "Direct (1:1 chat) + Group (3-party escrow rooms).",
      "Community (campus/mandi hubs) + Open (live ticker).",
      "System channel for Ed25519 cryptographic receipts.",
    ],
  },
  {
    badge: "03 · LIVE VIDEO ASSAY",
    sdk: "@nexconn/call@26.2.1 · NCCallEngine",
    title: "webrtc sfu inspection calls",
    points: [
      "Singapore SFU handles strict mobile NATs effortlessly.",
      "Streams 720p H264 video + 48kHz Opus audio.",
      "Feeds live frames to Rust pHash & 4096-pt FFT RPM check.",
    ],
  },
  {
    badge: "04 · SERVER AUTHORITY",
    sdk: "@nexconn/server-sdk@0.1.2 · REST v4",
    title: "server rooms & ai streaming",
    points: [
      "Strongly-typed trust boundary for tokens & rooms.",
      "Streams Gemini translations via RC:StreamMsg.",
      "Powers 90-second AI + human dispute rulings.",
    ],
  },
  {
    badge: "05 · EVIDENCE VAULT",
    sdk: "RC:SightMsg · RC:FileMsg · RC:ImgMsg",
    title: "built-in s3 media pipeline",
    points: [
      "Zero external S3/CDN wiring needed.",
      "Uploads MP4 inspection clips, PDF invoices & macro photos.",
      "Instant delivery receipts on Singapore S3 edge.",
    ],
  },
  {
    badge: "06 · EDGE OBSERVABILITY",
    sdk: "Polaris R1–R4 · AreaCode.SG",
    title: "live call & presence telemetry",
    points: [
      "Real-time bitrate, jitter, and packet-loss tracking.",
      "Detects network drops vs. camera tampering.",
      "Unified across Android APK (v1.0.0) & Web Desk.",
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
      "Stage 1: Rust Aho-Corasick scrubs PII (<300µs); Gemini streams dual-script chat.",
      "Stage 2: Go 1.24 8-state Escrow FSM locks funds with optimistic CAS.",
      "Stage 3: Live NCCallEngine video verified via 64-bit DCT pHash & 4096-pt FFT.",
      "Stage 4: Ed25519 hash-chained voucher; pHash mismatch triggers 90s freeze tribunal.",
    ],
  },
  {
    step: "03. NEXCONN SDK & CHANNELS",
    heading: "4 Official SDKs + All 5 Channel Types",
    points: [
      "SDKs: @nexconn/engine, @nexconn/chat, @nexconn/chatui, @nexconn/call, @nexconn/server-sdk.",
      "Channels: Direct, Group, Community, Open & System active on AreaCode.SG.",
      "Media & AI: RC:StreamMsg, RC:SightMsg, RC:FileMsg, RC:ImgMsg.",
    ],
  },
  {
    step: "04. POLYGLOT STACK & BENCHMARKS",
    heading: "Go 1.24 · Rust 1.85 · Node.js 22 · React 19 · Android",
    points: [
      "Go Deal Engine (:4002): 8-state FSM (0.008ms p99), 24h idempotency, SSE.",
      "Rust Verifier (:4003): PII scrub (0.03ms p99), pHash assay (0.21ms p99), Ed25519.",
      "Node Bridge (:4001): @nexconn/server-sdk, Gemini 2.5 Flash/Pro & Bhashini ASR.",
      "Clients: React 19 + Tailwind v4 Web Desk & Android APK (v1.0.0 arm64).",
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
