import { TRANSITIONS, type FsmAction, type FsmState } from "@samadhan/shared-types";
import type { DemoState } from "./store";

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

export const SCRIPT_MESSAGES: Record<
  "m1_buyer" | "m2_seller" | "m3_escrow" | "m4_receipt" | "m5_verdict",
  DemoMessage
> = {
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

export function applyFsmMove(
  state: DemoState,
  action: FsmAction,
  actor: "buyer" | "seller" | "arbitrator",
  latencyMs = 0.9
): DemoState {
  const nextFsm = TRANSITIONS[state.fsm]?.[action];
  if (!nextFsm) {
    return state;
  }
  const entry: DemoEventLogEntry = {
    id: `ev-${state.eventLog.length + 1}`,
    t: state.step,
    actor,
    action,
    from: state.fsm,
    to: nextFsm,
    latencyMs,
  };
  return {
    ...state,
    fsm: nextFsm,
    eventLog: [...state.eventLog, entry],
  };
}

export function applyStep(state: DemoState, targetStep: number): DemoState {
  const seq = (state.lastPacket?.seq ?? 0) + 1;
  switch (targetStep) {
    case 1:
      return {
        ...state,
        step: 1,
        buyerScreen: "B2",
        sellerScreen: "S1",
        sellerToast: "rajesh started a deal",
        lastPacket: { seq, from: "buyer", to: "seller", label: "OPEN_DEAL" },
      };
    case 2:
      return {
        ...state,
        step: 2,
        buyerScreen: "B2",
        sellerScreen: "S2",
        sellerToast: undefined,
        messages: [...state.messages, SCRIPT_MESSAGES.m1_buyer],
        lastPacket: { seq, from: "buyer", to: "seller", label: "MSG_TA_TO_HI" },
      };
    case 3:
      return {
        ...state,
        step: 3,
        buyerScreen: "B2",
        sellerScreen: "S2",
        messages: [...state.messages, SCRIPT_MESSAGES.m2_seller],
        lastPacket: { seq, from: "seller", to: "buyer", label: "MSG_HI_TO_TA" },
      };
    case 4: {
      const moved = applyFsmMove(state, "LOCK_ESCROW", "buyer", 0.9);
      if (moved === state) return state;
      return {
        ...moved,
        step: 4,
        buyerScreen: "B3",
        sellerScreen: "S2",
        messages: [...moved.messages, SCRIPT_MESSAGES.m3_escrow],
        lastPacket: { seq, from: "buyer", to: "seller", label: "LOCK_ESCROW" },
      };
    }
    case 5: {
      const moved = applyFsmMove(state, "START_ASSAY", "seller", 1.1);
      if (moved === state) return state;
      return {
        ...moved,
        step: 5,
        buyerScreen: "B4",
        sellerScreen: "S3",
        incomingCallBanner: true,
        rpm: 1840,
        frameMatch: 48,
        checklist: [true, false, false],
        lastPacket: { seq, from: "seller", to: "buyer", label: "START_ASSAY" },
      };
    }
    case 6:
      return {
        ...state,
        step: 6,
        buyerScreen: "B4",
        sellerScreen: "S3",
        incomingCallBanner: false,
        rpm: 4820,
        frameMatch: 96,
        checklist: [true, true, true],
        lastPacket: { seq, from: "seller", to: "buyer", label: "ASSAY_STREAM" },
      };
    case 7: {
      if (state.branch === "happy") {
        const moved = applyFsmMove(state, "MARK_ASSAY_VERIFIED", "buyer", 0.8);
        if (moved === state) return state;
        return {
          ...moved,
          step: 7,
          buyerScreen: "B5",
          sellerScreen: "S4",
          messages: [...moved.messages, SCRIPT_MESSAGES.m4_receipt],
          lastPacket: { seq, from: "buyer", to: "seller", label: "MARK_ASSAY_VERIFIED" },
        };
      }
      const moved = applyFsmMove(state, "RAISE_DISPUTE", "buyer", 1.0);
      if (moved === state) return state;
      return {
        ...moved,
        step: 7,
        buyerScreen: "B6",
        sellerScreen: "S6",
        freezeLeft: 87,
        lastPacket: { seq, from: "buyer", to: "seller", label: "RAISE_DISPUTE" },
      };
    }
    case 8: {
      if (state.branch === "happy") {
        const moved = applyFsmMove(state, "RELEASE_FUNDS", "buyer", 0.9);
        if (moved === state) return state;
        return {
          ...moved,
          step: 8,
          buyerScreen: "B5",
          sellerScreen: "S5",
          playing: false,
          lastPacket: { seq, from: "buyer", to: "seller", label: "RELEASE_FUNDS" },
        };
      }
      const moved = applyFsmMove(state, "RESOLVE_SPLIT", "arbitrator", 1.1);
      if (moved === state) return state;
      return {
        ...moved,
        step: 8,
        buyerScreen: "B7",
        sellerScreen: "S6",
        freezeLeft: 72,
        verdict: { buyerPct: 30, sellerPct: 70 },
        messages: [...moved.messages, SCRIPT_MESSAGES.m5_verdict],
        playing: false,
        lastPacket: { seq, from: "arbiter", to: "buyer", label: "RESOLVE_SPLIT" },
      };
    }
    default:
      return state;
  }
}
