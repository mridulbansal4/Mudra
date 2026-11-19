import { motion, type MotionValue } from "motion/react";
import { useReducedMotion } from "../motion/hooks";

export interface CorridorProps {
  scale?: MotionValue<number>;
  y?: MotionValue<string>;
  glowOpacity?: MotionValue<number>;
}

const SLAB_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

function getSlabBackground(index: number): string {
  // 1-indexed slab 3 (index 2) uses warm edge gradient; slab 6 (index 5) uses cool edge gradient
  if (index === 2) {
    return "var(--slab-warm)";
  }
  if (index === 5) {
    return "var(--slab-cool)";
  }
  return "var(--slab-light)";
}

function getSlabClipPath(index: number): string {
  return index % 2 === 0
    ? "polygon(0 8%, 100% 0, 100% 100%, 0 100%)"
    : "polygon(0 0, 100% 8%, 100% 100%, 0 100%)";
}

export function Corridor({ scale, y, glowOpacity }: CorridorProps) {
  const reduced = Boolean(useReducedMotion());

  return (
    <motion.div
      aria-hidden="true"
      style={
        reduced
          ? {
              perspective: "1200px",
              perspectiveOrigin: "50% 45%",
            }
          : {
              perspective: "1200px",
              perspectiveOrigin: "50% 45%",
              scale,
              y,
              willChange: "transform",
            }
      }
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {!reduced ? (
        <style>{`
          @keyframes corridor-slab-breathe-l {
            0%, 100% { transform: translateX(var(--sx)) rotateY(62deg) translateZ(calc(var(--sz) - 6px)); }
            50% { transform: translateX(var(--sx)) rotateY(62deg) translateZ(calc(var(--sz) + 6px)); }
          }
          @keyframes corridor-slab-breathe-r {
            0%, 100% { transform: translateX(var(--sx)) rotateY(-62deg) translateZ(calc(var(--sz) - 6px)); }
            50% { transform: translateX(var(--sx)) rotateY(-62deg) translateZ(calc(var(--sz) + 6px)); }
          }
        `}</style>
      ) : null}

      {/* 3D scene root */}
      <div
        className="relative flex size-full items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Left wall: 9 vertical slabs */}
        {SLAB_INDICES.map((k) => {
          const offsetX = -(180 + k * 58);
          const offsetZ = -(k * 120);
          return (
            <div
              key={`left-${k}`}
              style={{
                width: "90px",
                height: "70vh",
                borderRadius: 0,
                background: getSlabBackground(k),
                clipPath: getSlabClipPath(k),
                borderRight: "1px solid rgba(255,255,255,0.08)",
                ["--sx" as string]: `${offsetX}px`,
                ["--sz" as string]: `${offsetZ}px`,
                transform: `translateX(${offsetX}px) rotateY(62deg) translateZ(${offsetZ}px)`,
                animation: reduced
                  ? "none"
                  : `corridor-slab-breathe-l 8s ease-in-out ${k * 0.35}s infinite`,
              }}
              className="absolute"
            />
          );
        })}

        {/* Right wall: 9 vertical slabs */}
        {SLAB_INDICES.map((k) => {
          const offsetX = 180 + k * 58;
          const offsetZ = -(k * 120);
          return (
            <div
              key={`right-${k}`}
              style={{
                width: "90px",
                height: "70vh",
                borderRadius: 0,
                background: getSlabBackground(k),
                clipPath: getSlabClipPath(k),
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                ["--sx" as string]: `${offsetX}px`,
                ["--sz" as string]: `${offsetZ}px`,
                transform: `translateX(${offsetX}px) rotateY(-62deg) translateZ(${offsetZ}px)`,
                animation: reduced
                  ? "none"
                  : `corridor-slab-breathe-r 8s ease-in-out ${k * 0.35}s infinite`,
              }}
              className="absolute"
            />
          );
        })}

        {/* Floor plane (200% wide, rotateX 78deg) with 2 faint perspective lines */}
        <div
          style={{
            width: "200%",
            height: "75vh",
            bottom: "-18vh",
            transform: "rotateX(78deg)",
            background:
              "linear-gradient(180deg, transparent, rgba(255,255,255,0.04) 40%, transparent)",
          }}
          className="absolute flex justify-center"
        >
          <div
            className="h-full w-[320px]"
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              borderRight: "1px solid rgba(255,255,255,0.05)",
            }}
          />
        </div>

        {/* End-of-corridor glow (220x320 rect + 2 thin vertical light bars) */}
        <motion.div
          style={{
            width: "220px",
            height: "320px",
            opacity: reduced ? 0.32 : glowOpacity,
            background:
              "radial-gradient(closest-side, rgba(255,255,255,0.85), transparent)",
          }}
          className="relative flex items-center justify-center"
        />
        <div className="absolute flex items-center justify-center gap-3">
          <span
            className="h-[180px] w-[2px]"
            style={{
              backgroundColor: "rgba(255,255,255,0.4)",
              filter: "blur(1px)",
            }}
          />
          <span
            className="h-[180px] w-[2px]"
            style={{
              backgroundColor: "rgba(255,255,255,0.4)",
              filter: "blur(1px)",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
