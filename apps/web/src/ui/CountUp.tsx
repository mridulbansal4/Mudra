import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

export interface CountUpProps {
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatIndian?: boolean;
  durationMs?: number;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t >= 0.85 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -8.5));
}

export function CountUp({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
  formatIndian = false,
  durationMs = 900,
  className = "",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reducedMotion = useReducedMotion();
  const [val, setVal] = useState<number>(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      setVal(target);
      return;
    }
    if (!inView) return;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / durationMs);
      const eased = easeOutExpo(p);
      setVal(target * eased);
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setVal(target);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, durationMs, reducedMotion]);

  const formatted = formatIndian
    ? Math.round(val).toLocaleString("en-IN")
    : decimals > 0
      ? val.toFixed(decimals)
      : String(Math.round(val));

  return (
    <span ref={ref} className={`num ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
