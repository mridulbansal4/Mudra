import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "../../motion/hooks";

export interface CountdownRingProps {
  seconds: number;
  maxSeconds?: number;
  size?: number;
  showLabel?: boolean;
}

function SlotDigit({ digit, fontSize }: { digit: string; fontSize: number }) {
  const reduced = Boolean(useReducedMotion());
  if (reduced) {
    return <span className="inline-block">{digit}</span>;
  }
  return (
    <span
      className="relative inline-flex overflow-hidden justify-center"
      style={{ height: `${fontSize}px`, width: `${Math.round(fontSize * 0.62)}px` }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: "100%", opacity: 0.4 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="inline-block leading-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function CountdownRing({
  seconds,
  maxSeconds = 90,
  size = 220,
  showLabel = true,
}: CountdownRingProps) {
  const stroke = size >= 180 ? 10 : 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, seconds / maxSeconds));
  const offset = c * (1 - ratio);
  const digits = String(Math.max(0, Math.round(seconds))).padStart(2, "0").split("");
  const numFontSize = size >= 180 ? 64 : 32;

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#232323"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ff8744"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 160ms linear" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div
          aria-label={`${seconds} seconds remaining`}
          className="num flex items-center justify-center font-extrabold text-fg leading-none"
          style={{ fontSize: `${numFontSize}px` }}
        >
          {digits.map((d, idx) => (
            <SlotDigit key={idx} digit={d} fontSize={numFontSize} />
          ))}
        </div>
        {showLabel ? (
          <span className="mt-2 text-[12px] font-medium lowercase text-muted">
            seconds to verdict
          </span>
        ) : null}
      </div>
    </div>
  );
}
