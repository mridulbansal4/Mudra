import type { RefObject } from "react";
import { useReducedMotion, useScroll, type MotionValue } from "motion/react";

export { useReducedMotion };

export const ease = {
  expoOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.77, 0, 0.175, 1] as [number, number, number, number],
  ios: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

export type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>["offset"];

export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  offset: ScrollOffset = ["start start", "end end"]
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });
  return scrollYProgress;
}
