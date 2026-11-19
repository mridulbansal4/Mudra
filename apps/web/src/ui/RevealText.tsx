import { motion, useTransform, type MotionValue } from "motion/react";
import { useReducedMotion } from "../motion/hooks";

export interface RevealTextProps {
  text: string;
  progress: MotionValue<number>;
  boldLastWords?: number;
  className?: string;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function RevealWord({
  word,
  index,
  total,
  progress,
  boldWhenLit,
  reduced,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  boldWhenLit: boolean;
  reduced: boolean;
}) {
  const opacity = useTransform(progress, (p) => {
    if (reduced) return 1;
    const q = clamp((p - 0.1) / 0.75, 0, 1);
    return clamp(q * total - index, 0, 1);
  });

  if (reduced) {
    return (
      <span
        aria-hidden="true"
        className={`rw relative inline-block mr-[0.28em] text-fg ${boldWhenLit ? "font-bold" : ""}`}
      >
        {word}{" "}
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="rw relative inline-block mr-[0.28em]">
      <span style={{ color: "#3a3a3a" }}>{word} </span>
      <motion.span
        className={`absolute inset-0 text-fg ${boldWhenLit ? "font-bold" : ""}`}
        style={{ opacity }}
      >
        {word}{" "}
      </motion.span>
    </span>
  );
}

export function RevealText({
  text,
  progress,
  boldLastWords = 0,
  className = "",
}: RevealTextProps) {
  const reduced = Boolean(useReducedMotion());
  const words = text.trim().split(/\s+/);
  const total = words.length;

  return (
    <p aria-label={text} className={`t-reveal ${className}`}>
      {words.map((word, idx) => (
        <RevealWord
          key={`${idx}-${word}`}
          word={word}
          index={idx}
          total={total}
          progress={progress}
          boldWhenLit={boldLastWords > 0 && idx >= total - boldLastWords}
          reduced={reduced}
        />
      ))}
    </p>
  );
}
