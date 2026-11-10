/** Motion constants and helpers per docs/02-design/DESIGN_SYSTEM.md §5. */

export const APPLE_SPRINGS = {
  /** Critically damped — default UI. */
  snappy: { response: 0.3, damping: 1.0 },
  smooth: { response: 0.35, damping: 1.0 },
  /** Gesture-driven release only. */
  bouncy: { response: 0.35, damping: 0.8 },
} as const;

/** Distance (px) a flick travels before rest, from WWDC "Designing Fluid Interfaces". */
export function projectMomentum(initialVelocityPxPerSec: number, decelerationRate = 0.998): number {
  return ((initialVelocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** CSS easing approximating a spring with the given damping ratio (no overshoot when damping ≥ 1). */
export function springEasing(damping: number): string {
  return damping >= 1 ? "cubic-bezier(0.2, 0.9, 0.25, 1)" : "cubic-bezier(0.25, 1.25, 0.4, 1)";
}
