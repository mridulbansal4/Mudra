import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

export interface LogoMarkProps {
  size?: number;
  playIntro?: boolean;
  className?: string;
}

export function LogoMark({ size = 28, playIntro = false, className = "" }: LogoMarkProps) {
  const height = Math.round((size * 72) / 64);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 72"
      width={size}
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6 6h52v34c0 13-11 22-26 28C17 62 6 53 6 40V6z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="miter"
        style={
          playIntro
            ? {
                strokeDasharray: 220,
                strokeDashoffset: 0,
                animation: "logo-shield-draw 900ms cubic-bezier(0.65,0,0.35,1) both",
              }
            : undefined
        }
      />
      <path
        d="M6 6l6 6h40l6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
        opacity=".55"
        style={
          playIntro
            ? {
                strokeDasharray: 80,
                strokeDashoffset: 0,
                animation: "logo-Facet-draw 900ms cubic-bezier(0.65,0,0.35,1) both",
              }
            : undefined
        }
      />
      <path
        d="M19 50V22l13 16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="miter"
        strokeLinecap="square"
        style={
          playIntro
            ? {
                animation: "logo-m-left 400ms cubic-bezier(0.16,1,0.3,1) 900ms both",
              }
            : undefined
        }
      />
      <path
        d="M45 50V22L32 38"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="miter"
        strokeLinecap="square"
        style={
          playIntro
            ? {
                animation: "logo-m-right 400ms cubic-bezier(0.16,1,0.3,1) 900ms both",
              }
            : undefined
        }
      />
    </svg>
  );
}

export interface LogoProps {
  layout?: "stack" | "row";
  markSize?: number;
  wordmarkSize?: number;
  intro?: boolean;
  className?: string;
}

export function Logo({
  layout = "stack",
  markSize = 24,
  wordmarkSize,
  intro = false,
  className = "",
}: LogoProps) {
  const reducedMotion = useReducedMotion();
  const [playIntro, setPlayIntro] = useState(() => {
    if (!intro) return false;
    try {
      if (typeof window !== "undefined" && !sessionStorage.getItem("logo-intro")) {
        sessionStorage.setItem("logo-intro", "1");
        return true;
      }
      return false;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (reducedMotion && playIntro) {
      setPlayIntro(false);
    }
  }, [reducedMotion, playIntro]);

  const resolvedWordmarkSize = wordmarkSize ?? (layout === "row" ? 13 : 11);

  return (
    <span
      className={`inline-flex text-fg select-none ${
        layout === "row" ? "flex-row items-center gap-3" : "flex-col items-center gap-1.5"
      } ${className}`}
    >
      {playIntro ? (
        <style>{`
          @keyframes logo-shield-draw {
            from { stroke-dashoffset: 220; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes logo-Facet-draw {
            from { stroke-dashoffset: 80; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes logo-m-left {
            from { opacity: 0; transform: translateX(-8px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes logo-m-right {
            from { opacity: 0; transform: translateX(8px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes logo-wordmark-up {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      ) : null}
      <LogoMark size={markSize} playIntro={playIntro} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: `${resolvedWordmarkSize}px`,
          fontWeight: 800,
          letterSpacing: "0.28em",
          lineHeight: 1,
          textTransform: "uppercase",
          animation: playIntro
            ? "logo-wordmark-up 300ms cubic-bezier(0.16,1,0.3,1) 1300ms both"
            : undefined,
        }}
      >
        MUDRA
      </span>
    </span>
  );
}
