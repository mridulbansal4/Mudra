import {
  BadgeCheck,
  Camera,
  Fan,
  FileSignature,
  Gauge,
  Handshake,
  Languages,
  Lock,
  ReceiptText,
  Scale,
  ScanEye,
  ShieldCheck,
  Snowflake,
  Timer,
  Vault,
  type LucideIcon,
} from "lucide-react";

export type ChapterPerspective = "buyer" | "seller" | "arbitrator";

export interface ProtectionRow {
  icon: LucideIcon;
  text: string;
}

export interface HowChapterDef {
  id: string;
  eyebrow: string;
  headline: string;
  // SPEC-GAP: §7.2 specifies "2–3 sentence .t-lead" per chapter; authored concise 2-sentence leads summarizing each chapter's exact state transition
  lead: string;
  protections: [ProtectionRow, ProtectionRow, ProtectionRow];
  perspectives: ChapterPerspective[];
}

export const HOW_CHAPTERS: HowChapterDef[] = [
  {
    id: "chapter-created",
    eyebrow: "CREATED",
    headline: "a deal, not a dm.",
    lead: "rajesh opens a group deal channel in tamil while vikram reads every offer in hindi. terms and motor claims are extracted and pinned before a single rupee moves.",
    protections: [
      { icon: ShieldCheck, text: "pii scrubbed before translation" },
      { icon: Languages, text: "every message translated, original kept" },
      { icon: ReceiptText, text: "deal terms pinned to the chat" },
    ],
    perspectives: ["buyer", "seller"],
  },
  {
    id: "chapter-funded",
    eyebrow: "FUNDED",
    headline: "money that waits.",
    lead: "one slide locks ₹1,45,000 into a version-checked escrow state machine. vikram gets cryptographic proof that the money is waiting, while rajesh knows it cannot move without verification.",
    protections: [
      { icon: Vault, text: "upi mandate, not a transfer" },
      { icon: Lock, text: "idempotent — a double tap can't double pay" },
      { icon: Gauge, text: "version-locked state change" },
    ],
    perspectives: ["buyer", "seller"],
  },
  {
    id: "chapter-inspection-live",
    eyebrow: "INSPECTION LIVE",
    headline: "the product testifies.",
    lead: "vikram points his camera at the juki overlock machine on a live call. every video frame is hashed in rust and the motor audio is checked against the 4,800 rpm claim.",
    protections: [
      { icon: ScanEye, text: "64-bit frame fingerprint" },
      { icon: Fan, text: "motor rpm from audio" },
      { icon: Camera, text: "simulated camera if yours is off" },
    ],
    perspectives: ["buyer", "seller"],
  },
  {
    id: "chapter-assay-verified",
    eyebrow: "ASSAY VERIFIED",
    headline: "proof, signed.",
    lead: "once the frame match and motor rpm pass, the verifier signs an ed25519 receipt and posts it to the read-only system channel. both sides hold identical proof of inspection.",
    protections: [
      { icon: FileSignature, text: "ed25519-signed receipt" },
      { icon: ReceiptText, text: "receipt posted as a system message" },
      { icon: Lock, text: "nobody can edit it later" },
    ],
    perspectives: ["buyer", "seller"],
  },
  {
    id: "chapter-released",
    eyebrow: "RELEASED",
    headline: "done. both of you said so.",
    lead: "rajesh confirms release and ₹1,45,000 settles to vikram's account in a single state transition. every step from first message to final payout stays sealed in the ledger.",
    protections: [
      { icon: Handshake, text: "both parties confirm" },
      { icon: BadgeCheck, text: "funds release in one state change" },
      { icon: ReceiptText, text: "full audit trail" },
    ],
    perspectives: ["buyer", "seller"],
  },
  {
    id: "chapter-dispute",
    eyebrow: "DISPUTED → ARBITRATED / REFUNDED",
    headline: "freeze, don't fight.",
    lead: "if the machine fails inspection, one tap freezes the room and starts a ninety-second tribunal timer. an arbitrator reviews the signed telemetry and issues a binding split or refund.",
    protections: [
      { icon: Snowflake, text: "one tap freezes the channel" },
      { icon: Timer, text: "90-second arbitrator window" },
      { icon: Scale, text: "signed verdict: split or refund" },
    ],
    perspectives: ["buyer", "seller", "arbitrator"],
  },
];
