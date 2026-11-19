import type { FsmState } from "@samadhan/shared-types";
import type { ReactNode } from "react";

export type StatusTone = "locked" | "live" | "frozen" | "neutral";

export interface StatusPillProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

const TONE_MAP: Record<StatusTone, { bg: string; color: string; pulse?: boolean }> = {
  locked: { bg: "rgba(229, 254, 64, 0.10)", color: "var(--neo-paccha)" },
  live: { bg: "rgba(255, 135, 68, 0.12)", color: "var(--orange-sunshine)", pulse: true },
  frozen: { bg: "rgba(255, 77, 77, 0.12)", color: "#ff4d4d" },
  neutral: { bg: "var(--card-3)", color: "var(--fg-2)" },
};

export function StatusPill({ tone = "neutral", children, className = "" }: StatusPillProps) {
  const t = TONE_MAP[tone];
  return (
    <span
      className={`inline-flex h-[24px] w-fit self-start items-center gap-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] select-none ${className}`}
      style={{
        borderRadius: "999px",
        backgroundColor: t.bg,
        color: t.color,
      }}
    >
      {t.pulse ? (
        <span
          aria-hidden="true"
          className="inline-block size-[6px] rounded-full"
          style={{
            backgroundColor: "var(--orange-sunshine)",
            animation: "pulse-dot 1.4s ease-in-out infinite",
          }}
        />
      ) : null}
      <span>{children}</span>
    </span>
  );
}

export function fsmToneAndLabel(state: FsmState): { tone: StatusTone; label: string } {
  switch (state) {
    case "CREATED":
      return { tone: "neutral", label: "CREATED" };
    case "FUNDED":
      return { tone: "locked", label: "IN ESCROW" };
    case "INSPECTION_LIVE":
      return { tone: "live", label: "LIVE ASSAY" };
    case "ASSAY_VERIFIED":
      return { tone: "locked", label: "VERIFIED" };
    case "RELEASED":
      return { tone: "locked", label: "RELEASED" };
    case "DISPUTED_FROZEN":
      return { tone: "frozen", label: "FROZEN" };
    case "ARBITRATED_SPLIT":
      return { tone: "locked", label: "SPLIT 70/30" };
    case "REFUNDED":
      return { tone: "neutral", label: "REFUNDED" };
  }
}
