// Shared contracts between apps/web, services/nexconn-bridge-node and the Go deal engine.
// Source of truth: docs/03-engineering/IMPLEMENTATION_CONTRACT.md + docs/03-engineering/API_SPEC.md

export type Locale = "en-IN" | "hi-IN" | "mr-IN" | "ta-IN";
export type Role = "buyer" | "seller" | "arbitrator" | "guest";

export const FSM_STATES = [
  "CREATED",
  "FUNDED",
  "INSPECTION_LIVE",
  "ASSAY_VERIFIED",
  "RELEASED",
  "DISPUTED_FROZEN",
  "ARBITRATED_SPLIT",
  "REFUNDED",
] as const;
export type FsmState = (typeof FSM_STATES)[number];

export type FsmAction =
  | "LOCK_ESCROW"
  | "START_ASSAY"
  | "MARK_ASSAY_VERIFIED"
  | "RELEASE_FUNDS"
  | "RAISE_DISPUTE"
  | "RESOLVE_SPLIT"
  | "REFUND_BUYER";

/** Mirrors the Go transition table so the UI can show which buttons are live. */
export const TRANSITIONS: Record<FsmState, Partial<Record<FsmAction, FsmState>>> = {
  CREATED: { LOCK_ESCROW: "FUNDED" },
  FUNDED: { START_ASSAY: "INSPECTION_LIVE", RAISE_DISPUTE: "DISPUTED_FROZEN" },
  INSPECTION_LIVE: { MARK_ASSAY_VERIFIED: "ASSAY_VERIFIED", RAISE_DISPUTE: "DISPUTED_FROZEN" },
  ASSAY_VERIFIED: { RELEASE_FUNDS: "RELEASED", RAISE_DISPUTE: "DISPUTED_FROZEN" },
  RELEASED: {},
  DISPUTED_FROZEN: { RESOLVE_SPLIT: "ARBITRATED_SPLIT", REFUND_BUYER: "REFUNDED" },
  ARBITRATED_SPLIT: {},
  REFUNDED: {},
};

export function storyStage(state: FsmState): 1 | 2 | 3 | 4 {
  switch (state) {
    case "CREATED":
      return 1;
    case "FUNDED":
      return 2;
    case "INSPECTION_LIVE":
    case "ASSAY_VERIFIED":
      return 3;
    default:
      return 4;
  }
}

export interface EscrowContract {
  fsm_state: FsmState;
  amount_paise: number;
  currency: "INR";
  version: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  verified: boolean;
}

export interface SystemVoucher {
  voucher_type: string;
  curr_voucher_sha256: string;
  prev_voucher_sha256?: string;
  ed25519_signature: string;
  created_at?: string;
  engine?: string;
}

export interface AssayLog {
  stage_tag?: string;
  frame_phash_hex?: string;
  audio_fft_rpm_peak?: number;
  assay_passed?: boolean;
  created_at?: string;
  [k: string]: unknown;
}

export interface ChatMessage {
  id: string;
  deal_id: string;
  sender_role: Role | "system" | "ai";
  sender_name?: string;
  message_type: string; // e.g. x-mudra-bilingual-bubble
  source_locale?: Locale;
  target_locale?: Locale;
  raw_text?: string;
  translated_text?: string;
  extracted_terms?: Record<string, number | undefined>;
  extras?: Record<string, unknown>;
  created_at: string;
}

export interface DealView {
  deal_id: string;
  nexconn_channel_id: string;
  title: string;
  story_stage: number;
  buyer_nexconn_id?: string;
  seller_nexconn_id?: string;
  escrow_contract: EscrowContract;
  checklist_items: ChecklistItem[];
  assay_logs: AssayLog[];
  system_vouchers: SystemVoucher[];
  messages?: ChatMessage[];
  dispute?: DisputeView | null;
  [k: string]: unknown;
}

export interface DisputeView {
  dispute_id: string;
  deal_id: string;
  deal_title?: string;
  amount_paise?: number;
  reason_code?: string;
  description?: string;
  hamming_distance_phash?: number;
  freeze_remaining_sec?: number;
  arbitrator_nexconn_id?: string;
  recommended_split?: {
    buyer_refund_bps: number;
    seller_payout_bps: number;
    rationale?: string;
    summary?: string;
  };
  status?: string;
  [k: string]: unknown;
}

export interface NexconnSession {
  nexconn_user_id: string;
  access_token: string;
  locale?: Locale;
  mudra_jwt?: string;
  app_key?: string;
  mode?: "live" | "simulated";
  /** Sandbox provisioning reports the token mode under this name. */
  token_mode?: "live" | "simulated";
}

export interface ApiError {
  error: { code: string; message: string; trace_id?: string; retryable?: boolean };
}

export const LOCALE_LABEL: Record<Locale, string> = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "mr-IN": "मराठी",
  "ta-IN": "தமிழ்",
};

/** ₹ formatting with Indian lakh grouping, from paise. */
export function formatInr(paise: number): string {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}
