import { BadgeCheck, Languages, ReceiptText, Scale, Vault } from "lucide-react";
import { motion } from "motion/react";
import { useReducedMotion } from "../../motion/hooks";
import { DEAL_META, type DemoMessage } from "../script";

export interface BilingualBubbleProps {
  message: DemoMessage;
  viewer: "buyer" | "seller";
}

export function BilingualBubble({ message, viewer }: BilingualBubbleProps) {
  const reduced = Boolean(useReducedMotion());

  if (message.kind === "escrow") {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.28 }}
        className="w-full px-3.5 py-3"
        style={{
          borderRadius: "20px",
          border: "1px solid rgba(229, 254, 64, 0.25)",
          backgroundColor: "rgba(229, 254, 64, 0.04)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold lowercase text-neo-paccha">
            <Vault size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="num">₹1,45,000 sealed in escrow</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold lowercase text-neo-paccha">
            <BadgeCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>signed</span>
          </span>
        </div>
        <div className="mt-1.5 font-mono text-[11px] text-muted num">
          voucher · {DEAL_META.voucherHash}
        </div>
      </motion.div>
    );
  }

  if (message.kind === "receipt") {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.28 }}
        className="w-full px-3.5 py-3"
        style={{
          borderRadius: "20px",
          border: "1px solid rgba(229, 254, 64, 0.25)",
          backgroundColor: "rgba(229, 254, 64, 0.04)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold lowercase text-neo-paccha">
            <ReceiptText size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="num">{message.en}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold lowercase text-neo-paccha">
            <BadgeCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>signed</span>
          </span>
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted num">{DEAL_META.signatureHash}</div>
      </motion.div>
    );
  }

  if (message.kind === "verdict") {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.28 }}
        className="w-full px-3.5 py-3"
        style={{
          borderRadius: "20px",
          border: "1px solid rgba(255, 135, 68, 0.3)",
          backgroundColor: "rgba(255, 135, 68, 0.08)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold lowercase text-orange-sunshine">
            <Scale size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="num">{message.en}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold lowercase text-fg-2">
            <BadgeCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>signed</span>
          </span>
        </div>
      </motion.div>
    );
  }

  const isOwn = message.from === viewer;
  const primaryText = viewer === "buyer" ? message.ta : message.hi;
  const primaryLang = viewer === "buyer" ? "ta" : "hi";
  const secondaryText = viewer === "buyer" ? message.hi : message.ta;
  const secondaryLang = viewer === "buyer" ? "hi" : "ta";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.28 }}
      className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className="max-w-[78%] px-3.5 py-2.5 text-fg"
        style={{
          backgroundColor: isOwn ? "#6a35ff" : "var(--card-2)",
          borderRadius: isOwn ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
        }}
      >
        <p lang={primaryLang} className="num m-0 text-[15px] font-medium leading-[1.45] text-fg">
          {primaryText}
        </p>
        <div
          className="mt-2 pt-1.5 flex items-start gap-1.5"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.12)" }}
        >
          <Languages
            size={12}
            strokeWidth={1.5}
            aria-hidden="true"
            className="mt-0.5 shrink-0 opacity-70"
          />
          <p lang={secondaryLang} className="num m-0 text-[12px] leading-[1.4] opacity-70">
            {secondaryText}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
