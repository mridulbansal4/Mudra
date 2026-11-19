import type { FsmAction, FsmState } from "@samadhan/shared-types";

export type ScreenId =
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "A1";

export type DemoBranch = "happy" | "dispute";

export interface DemoMessage {
  id: string;
  from: "buyer" | "seller" | "system";
  ta: string;
  hi: string;
  en: string;
  kind: "text" | "escrow" | "receipt" | "verdict";
}

export interface DemoEventLogEntry {
  id: string;
  t: number;
  actor: "buyer" | "seller" | "arbitrator" | "system";
  action: FsmAction | string;
  from: FsmState;
  to: FsmState;
  latencyMs: number;
}

export const TOTAL_SCRIPT_STEPS = 8;

export const SCRIPT_MESSAGES: Record<"m1_buyer" | "m2_seller" | "m3_escrow" | "m4_receipt" | "m5_verdict", DemoMessage> = {
  m1_buyer: {
    id: "msg-1",
    from: "buyer",
    ta: "நான் ₹1,45,000-க்கு வாங்க தயார், மோட்டார் 4800 RPM சோதனை தேவை",
    hi: "मैं ₹1,45,000 में खरीदने को तैयार हूँ, मोटर का 4800 RPM टेस्ट चाहिए",
    en: "I'm ready to buy at ₹1,45,000, need a 4800 RPM motor test",
    kind: "text",
  },
  m2_seller: {
    id: "msg-2",
    from: "seller",
    hi: "₹1,45,000 ठीक है, मैं लाइव वीडियो पर सीरियल नंबर दिखा दूँगा",
    ta: "₹1,45,000 சரி, லைவ் வீடியோவில் சீரியல் நம்பரைக் காட்டுகிறேன்",
    en: "₹1,45,000 works, I'll show the serial number on live video",
    kind: "text",
  },
  m3_escrow: {
    id: "msg-3-escrow",
    from: "system",
    ta: "₹1,45,000 எஸ்க்ரோவில் சீல் செய்யப்பட்டது",
    hi: "₹1,45,000 एस्क्रो में सील किया गया",
    en: "₹1,45,000 sealed in escrow",
    kind: "escrow",
  },
  m4_receipt: {
    id: "msg-4-receipt",
    from: "system",
    ta: "சோதனை சரிபார்க்கப்பட்டது · 4,820 rpm · 96% பிரேம் பொருத்தம்",
    hi: "असे सत्यापित · 4,820 rpm · 96% फ़्रेम मैच",
    en: "assay verified · 4,820 rpm · 96% frame match",
    kind: "receipt",
  },
  m5_verdict: {
    id: "msg-5-verdict",
    from: "system",
    ta: "நடுவர் தீர்ப்பு · 70 / 30 பிரிப்பு",
    hi: "मध्यस्थ निर्णय · 70 / 30 विभाजन",
    en: "arbitrator verdict · split 70 / 30",
    kind: "verdict",
  },
};

export const DEAL_META = {
  id: "SD-2611-0042",
  item: "Juki MO-6814S industrial overlock machine",
  amountInr: 145000,
  amountFormatted: "₹1,45,000",
  claim: "motor runs at 4,800 rpm",
  warranty: "6-month warranty",
  upiMandate: "samadhan.demo@okaxis",
  voucherHash: "9f3a…c21e",
  signatureHash: "ed25519 · 4be1…09af",
  buyer: {
    name: "Rajesh Natarajan",
    shortName: "rajesh",
    city: "tirupur",
    initials: "RN",
    locale: "ta-IN" as const,
    langLabel: "தமிழ்",
  },
  seller: {
    name: "Vikramjeet Singh",
    shortName: "vikram",
    city: "ludhiana",
    initials: "VS",
    locale: "hi-IN" as const,
    langLabel: "हिन्दी",
  },
  arbitrator: {
    name: "Meera Krishnan",
    shortName: "meera",
    initials: "MK",
    locale: "en-IN" as const,
  },
} as const;
