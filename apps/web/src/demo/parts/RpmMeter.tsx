import { useEffect, useRef, useState } from "react";
import { Fan, ScanLine } from "lucide-react";
import { useReducedMotion } from "../../motion/hooks";

export interface RpmMeterProps {
  frameMatch: number;
  rpm: number;
}

const SPARK_BARS = [0.55, 0.72, 0.68, 0.85, 0.9, 0.94, 0.96, 0.98] as const;

function useTweenNumber(target: number, durationMs = 700, reduced = false): number {
  const [val, setVal] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      currentRef.current = target;
      setVal(target);
      return;
    }
    const from = currentRef.current;
    if (from === target) return;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (target - from) * eased;
      currentRef.current = next;
      setVal(next);
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setVal(target);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [durationMs, reduced, target]);

  return val;
}

export function RpmMeter({ frameMatch, rpm }: RpmMeterProps) {
  const reduced = Boolean(useReducedMotion());
  const displayMatch = useTweenNumber(frameMatch, 650, reduced);
  const displayRpm = useTweenNumber(rpm, 850, reduced);
  const spinDurationSec = displayRpm > 0 ? Math.max(0.25, 1800 / displayRpm) : 0;

  return (
    <div className="grid grid-cols-2 divide-x divide-[var(--hairline)]">
      {/* Left column: frame fingerprint */}
      <div className="pr-4 flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium lowercase text-muted">
          <ScanLine size={16} strokeWidth={1.5} aria-hidden="true" className="text-fg-2" />
          <span>frame match</span>
        </div>
        <div className="num text-[32px] font-extrabold leading-none text-fg">
          {Math.round(displayMatch)}%
        </div>
        {/* 8-bar sparkline */}
        <div aria-hidden="true" className="mt-1 flex h-[16px] items-end gap-1">
          {SPARK_BARS.map((h, i) => {
            const active = (i + 1) / SPARK_BARS.length <= displayMatch / 100;
            return (
              <span
                key={i}
                className="w-[4px]"
                style={{
                  height: `${Math.round(h * 16)}px`,
                  backgroundColor: active ? "var(--neo-paccha)" : "var(--card-3)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Right column: motor rpm */}
      <div className="pl-4 flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium lowercase text-muted">
          <Fan
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-neo-paccha"
            style={
              spinDurationSec > 0
                ? { animation: `spin-fan ${spinDurationSec.toFixed(2)}s linear infinite` }
                : undefined
            }
          />
          <span>motor</span>
        </div>
        <div className="num text-[32px] font-extrabold leading-none text-fg">
          {Math.round(displayRpm).toLocaleString("en-IN")}
        </div>
        <div className="num mt-1 text-[11px] font-semibold lowercase text-neo-paccha">
          claimed 4,800 · ±0.4%
        </div>
      </div>
    </div>
  );
}
