import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronsRight } from "lucide-react";
import { useReducedMotion } from "../../motion/hooks";
import { NeoButton } from "../../ui/NeoButton";

export interface SlideToLockProps {
  onLocked?: () => void;
  autoLock?: boolean;
  locked?: boolean;
}

const KNOB_SIZE = 64;

export function SlideToLock({ onLocked, autoLock = false, locked: lockedProp = false }: SlideToLockProps) {
  const reduced = Boolean(useReducedMotion());
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [maxTravel, setMaxTravel] = useState(240);
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(lockedProp);
  const [flash, setFlash] = useState(false);
  const startClientX = useRef(0);

  useEffect(() => {
    setLocked(lockedProp);
  }, [lockedProp]);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        setMaxTravel(Math.max(120, trackRef.current.clientWidth - KNOB_SIZE - 3));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!autoLock || reduced) return;
    const t = window.setTimeout(() => {
      setLocked(true);
      setDragX(maxTravel);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 120);
      onLocked?.();
    }, 450);
    return () => window.clearTimeout(t);
  }, [autoLock, maxTravel, onLocked, reduced]);

  if (reduced) {
    return (
      <NeoButton
        variant="paccha"
        size="lg"
        fullWidth
        disabled={locked}
        onClick={() => {
          setLocked(true);
          onLocked?.();
        }}
      >
        {locked ? "locked" : "lock now"}
      </NeoButton>
    );
  }

  const currentX = locked ? maxTravel : dragX;

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (locked) return;
    if (trackRef.current) {
      setMaxTravel(Math.max(120, trackRef.current.clientWidth - KNOB_SIZE - 3));
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    startClientX.current = e.clientX - dragX;
    setDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragging || locked) return;
    const next = Math.max(0, Math.min(maxTravel, e.clientX - startClientX.current));
    setDragX(next);
  };

  const handlePointerUp = () => {
    if (!dragging || locked) return;
    setDragging(false);
    if (dragX >= maxTravel * 0.85) {
      setDragX(maxTravel);
      setLocked(true);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 120);
      onLocked?.();
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative flex h-[64px] w-full items-center overflow-hidden select-none"
      style={{
        borderRadius: 0,
        backgroundColor: "#1a1a1a",
        border: "1.5px solid #3d3d3d",
        filter: flash ? "brightness(1.2)" : "none",
        transition: "filter 120ms ease-out",
      }}
    >
      {/* Paccha fill behind knob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 left-0 bg-neo-paccha"
        style={{
          width: `${currentX + KNOB_SIZE / 2}px`,
          transition: dragging ? "none" : "width 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
      />

      {/* Sweeping shimmer when unlocked */}
      {!locked ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-[30%]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
            animation: "shimmer 2.2s linear infinite",
          }}
        />
      ) : null}

      {/* Track label */}
      <span
        className="pointer-events-none relative z-10 w-full text-center text-[14px] font-bold lowercase tracking-[0.02em]"
        style={{
          color: locked ? "#0d0d0d" : "var(--muted)",
        }}
      >
        {locked ? "locked" : "slide to lock"}
      </span>

      {/* 64x64 paccha square knob */}
      <button
        type="button"
        aria-label={locked ? "Escrow locked" : "Slide to lock escrow"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !locked) {
            e.preventDefault();
            setDragX(maxTravel);
            setLocked(true);
            onLocked?.();
          }
        }}
        className="absolute top-0 left-0 z-20 flex items-center justify-center bg-neo-paccha text-paccha-ink cursor-grab active:cursor-grabbing"
        style={{
          width: "61px",
          height: "61px",
          borderRadius: 0,
          boxShadow: "4px 4px 0 #000",
          transform: `translate3d(${currentX}px, 0, 0)`,
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
          touchAction: "none",
        }}
      >
        <ChevronsRight size={24} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
