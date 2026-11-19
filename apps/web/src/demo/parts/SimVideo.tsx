import { useEffect, useRef, useState, type PointerEvent } from "react";
import { APPLE_SPRINGS, projectMomentum, springEasing } from "../../lib/apple-physics";
import { StatusPill } from "../../ui/StatusPill";

export interface SimVideoProps {
  perspective: "buyer" | "seller";
  liveSeconds: number;
  frameMatch: number;
  rpm: number;
  className?: string;
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SimVideo({
  perspective,
  liveSeconds,
  frameMatch,
  rpm,
  className = "",
}: SimVideoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pipCorner, setPipCorner] = useState<"tr" | "tl" | "br" | "bl">("tr");
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const [bracketFlash, setBracketFlash] = useState(false);

  const matched = frameMatch >= 90;

  useEffect(() => {
    if (!matched) return;
    setBracketFlash(true);
    const t = window.setTimeout(() => setBracketFlash(false), 320);
    return () => window.clearTimeout(t);
  }, [matched]);

  const handlePipDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePipMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragOffset) return;
    setDragOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePipUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragOffset) return;
    const dt = Math.max(16, performance.now() - dragStart.current.t);
    const vx = ((e.clientX - dragStart.current.x) / dt) * 1000;
    const vy = ((e.clientY - dragStart.current.y) / dt) * 1000;
    const projX = dragOffset.x + projectMomentum(vx, 0.998) * 0.15;
    const projY = dragOffset.y + projectMomentum(vy, 0.998) * 0.15;

    const isLeft =
      pipCorner === "tl" || pipCorner === "bl" ? projX < 90 : projX < -90;
    const isBottom =
      pipCorner === "bl" || pipCorner === "br" ? projY > -90 : projY > 90;

    setPipCorner(isBottom ? (isLeft ? "bl" : "br") : isLeft ? "tl" : "tr");
    setDragOffset(null);
  };

  const cornerPosClass =
    pipCorner === "tr"
      ? "top-3 right-3"
      : pipCorner === "tl"
        ? "top-12 left-3"
        : pipCorner === "br"
          ? "bottom-3 right-3"
          : "bottom-3 left-3";

  const bouncyEasing = springEasing(APPLE_SPRINGS.bouncy.damping);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{
        background:
          perspective === "seller"
            ? "radial-gradient(circle at 50% 45%, #232820 0%, #111310 60%, #090a09 100%)"
            : "radial-gradient(circle at 50% 45%, #1c1f24 0%, #0e1012 65%, #070809 100%)",
      }}
    >
      {/* Scanlines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* SVG film grain overlay at 6% opacity */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
        style={{ opacity: 0.06 }}
      >
        <filter id="sim-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#sim-film-grain)" />
      </svg>

      {/* Top-left LIVE pill */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <StatusPill tone="live">
          <span className="num">LIVE · {formatMmSs(liveSeconds)}</span>
        </StatusPill>
        {perspective === "seller" ? (
          <span className="rounded-full bg-pop-void/70 px-2.5 py-1 text-[11px] font-semibold lowercase text-fg-2">
            you're live to rajesh
          </span>
        ) : null}
      </div>

      {/* Buyer self-view draggable PiP (96x128 radius 16) */}
      {perspective === "buyer" ? (
        <div
          onPointerDown={handlePipDown}
          onPointerMove={handlePipMove}
          onPointerUp={handlePipUp}
          onPointerCancel={handlePipUp}
          className={`
            absolute z-20 flex flex-col justify-between p-2.5 cursor-grab active:cursor-grabbing
            ${cornerPosClass}
          `}
          style={{
            width: "96px",
            height: "128px",
            borderRadius: "16px",
            backgroundColor: "#161618",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.65)",
            transform: dragOffset ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)` : undefined,
            transition: dragOffset ? "none" : `all 350ms ${bouncyEasing}`,
            touchAction: "none",
          }}
        >
          <span className="text-[10px] font-bold lowercase text-muted">you</span>
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-card-3 text-[12px] font-bold text-fg">
            RN
          </div>
          <span className="num text-[10px] font-medium lowercase text-fg-2">tirupur</span>
        </div>
      ) : null}

      {/* Center machine silhouette + HUD brackets */}
      <div className="relative z-10 flex h-full min-h-[250px] flex-col items-center justify-center p-6">
        <div
          className="relative flex size-[184px] items-center justify-center"
          style={{
            filter: bracketFlash ? "brightness(1.6)" : "none",
            animation: "pulse-dot 2.4s ease-in-out infinite",
          }}
        >
          {/* 4 corner L-marks (1.5px paccha) */}
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 size-5 border-t-[1.5px] border-l-[1.5px] border-neo-paccha"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 size-5 border-t-[1.5px] border-r-[1.5px] border-neo-paccha"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 size-5 border-b-[1.5px] border-l-[1.5px] border-neo-paccha"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 size-5 border-b-[1.5px] border-r-[1.5px] border-neo-paccha"
          />

          {/* Slowly rotating industrial overlock sewing-machine silhouette SVG */}
          <style>{`
            @keyframes machine-rotate {
              0%, 100% { transform: perspective(600px) rotateY(-8deg) rotateZ(-1deg); }
              50% { transform: perspective(600px) rotateY(8deg) rotateZ(1deg); }
            }
          `}</style>
          <svg
            viewBox="0 0 160 120"
            width={142}
            height={106}
            fill="none"
            aria-hidden="true"
            style={{
              animation: "machine-rotate 9s ease-in-out infinite",
            }}
          >
            <path
              d="M18 96h124v10H18zM30 96V48c0-10 8-18 18-18h64c10 0 18 8 18 18v48"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
            />
            <path
              d="M52 48h42v24H52zM38 64v22M34 86h10"
              stroke="rgba(229,254,64,0.55)"
              strokeWidth="2"
            />
            <circle
              cx="118"
              cy="56"
              r="14"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <text
              x="56"
              y="63"
              fill="rgba(255,255,255,0.65)"
              fontSize="8"
              fontFamily="JetBrains Mono, monospace"
            >
              MO-6814S
            </text>
          </svg>
        </div>

        {/* HUD chip row */}
        <div className="mt-3 flex items-center gap-2">
          {matched ? (
            <span
              className="num px-2.5 py-1 text-[11px] font-bold lowercase text-paccha-ink bg-neo-paccha"
              style={{ borderRadius: "999px" }}
            >
              frame match {Math.round(frameMatch)}%
            </span>
          ) : (
            <span
              className="num px-2.5 py-1 text-[11px] font-semibold lowercase text-fg-2"
              style={{
                borderRadius: "999px",
                backgroundColor: "rgba(18,18,18,0.75)",
                border: "1px solid var(--hairline)",
              }}
            >
              scanning · {Math.round(rpm).toLocaleString("en-IN")} rpm
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
