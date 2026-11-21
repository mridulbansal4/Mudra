import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "motion/react";

export interface LogoMarkProps {
  size?: number;
  playIntro?: boolean;
  className?: string;
}

export function LogoMark({ size = 36, playIntro = false, className = "" }: LogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    vesselBg: `mudra-bg-${uid}`,
    rimGrad: `mudra-rim-${uid}`,
    innerWell: `mudra-well-${uid}`,
    archGrad: `mudra-arch-${uid}`,
    keystoneGrad: `mudra-key-${uid}`,
    keystoneGlow: `mudra-glow-${uid}`,
    shadow: `mudra-sh-${uid}`,
    grain: `mudra-gr-${uid}`,
    clip: `mudra-cl-${uid}`,
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Anodized obsidian vessel gradient */}
        <linearGradient id={ids.vesselBg} x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#26262b" />
          <stop offset="48%" stopColor="#141417" />
          <stop offset="100%" stopColor="#08080a" />
        </linearGradient>

        {/* Top-edge specular rim highlight */}
        <linearGradient id={ids.rimGrad} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.11" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
        </linearGradient>

        {/* Subtle inner well sheen */}
        <radialGradient id={ids.innerWell} cx="32" cy="20" r="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.01" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
        </radialGradient>

        {/* Brushed platinum gradient for the Mudra M-arch */}
        <linearGradient id={ids.archGrad} x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e4e4e8" />
          <stop offset="100%" stopColor="#a4a4ae" />
        </linearGradient>

        {/* Neo-paccha assay volt gradient for central keystone */}
        <linearGradient id={ids.keystoneGrad} x1="32" y1="32" x2="32" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0ff70" />
          <stop offset="55%" stopColor="#e5fe40" />
          <stop offset="100%" stopColor="#b8d916" />
        </linearGradient>

        {/* Localized volt aura behind keystone */}
        <radialGradient id={ids.keystoneGlow} cx="32" cy="38.5" r="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e5fe40" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#e5fe40" stopOpacity="0" />
        </radialGradient>

        {/* Layered ambient + contact shadow */}
        <filter id={ids.shadow} x="-18%" y="-14%" width="136%" height="142%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.65" />
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.8" />
        </filter>

        {/* Fine machined micro-grain texture */}
        <filter id={ids.grain} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.045 0"
            in="noise"
            result="softNoise"
          />
          <feComposite in="softNoise" in2="SourceGraphic" operator="in" />
        </filter>

        <clipPath id={ids.clip}>
          <path d="M32 4C51.5 4 60 12.5 60 32C60 51.5 51.5 60 32 60C12.5 60 4 51.5 4 32C4 12.5 12.5 4 32 4Z" />
        </clipPath>
      </defs>

      {/* Outer squircle monolith */}
      <g filter={`url(#${ids.shadow})`}>
        <path
          d="M32 4C51.5 4 60 12.5 60 32C60 51.5 51.5 60 32 60C12.5 60 4 51.5 4 32C4 12.5 12.5 4 32 4Z"
          fill={`url(#${ids.vesselBg})`}
          style={
            playIntro
              ? {
                  transformOrigin: "32px 32px",
                  animation: "mudra-vessel-in 520ms cubic-bezier(0.16,1,0.3,1) both",
                }
              : undefined
          }
        />
      </g>

      {/* Surface sheen + machined texture clipped to squircle */}
      <g clipPath={`url(#${ids.clip})`}>
        <rect x="4" y="4" width="56" height="56" fill={`url(#${ids.innerWell})`} />
        <rect x="4" y="4" width="56" height="56" fill="#ffffff" filter={`url(#${ids.grain})`} />
        <circle cx="32" cy="38.5" r="13" fill={`url(#${ids.keystoneGlow})`} />
      </g>

      {/* Inner precision recessed ring */}
      <path
        d="M32 7.5C49 7.5 56.5 15 56.5 32C56.5 49 49 56.5 32 56.5C15 56.5 7.5 49 7.5 32C7.5 15 15 7.5 32 7.5Z"
        stroke="#ffffff"
        strokeOpacity="0.055"
        strokeWidth="0.75"
      />

      {/* Specular rim bevel */}
      <path
        d="M32 4.5C51.1 4.5 59.5 12.9 59.5 32C59.5 51.1 51.1 59.5 32 59.5C12.9 59.5 4.5 51.1 4.5 32C4.5 12.9 12.9 4.5 32 4.5Z"
        stroke={`url(#${ids.rimGrad})`}
        strokeWidth="1.05"
      />

      {/* Twin converging Mudra M-pillars */}
      <path
        d="M17.5 44.5V24.8C17.5 19.6 22.6 17.8 26.3 21.5L32 27.2L37.7 21.5C41.4 17.8 46.5 19.6 46.5 24.8V44.5"
        stroke={`url(#${ids.archGrad})`}
        strokeWidth="3.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          playIntro
            ? {
                strokeDasharray: 110,
                strokeDashoffset: 0,
                animation: "mudra-arch-draw 720ms cubic-bezier(0.22,1,0.36,1) 140ms both",
              }
            : undefined
        }
      />

      {/* Central Assay Keystone (escrow seal node) */}
      <path
        d="M32 32.3L37.2 38.4L32 44.5L26.8 38.4Z"
        fill={`url(#${ids.keystoneGrad})`}
        style={
          playIntro
            ? {
                transformOrigin: "32px 38.4px",
                animation: "mudra-keystone-pop 440ms cubic-bezier(0.16,1,0.3,1) 520ms both",
              }
            : undefined
        }
      />
      {/* Top facet specular glint on keystone */}
      <path
        d="M32 32.8L35.4 36.8L32 35.8L28.6 36.8Z"
        fill="#ffffff"
        fillOpacity="0.45"
        style={
          playIntro
            ? {
                transformOrigin: "32px 38.4px",
                animation: "mudra-keystone-pop 440ms cubic-bezier(0.16,1,0.3,1) 520ms both",
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
  label?: string;
  className?: string;
}

export function Logo({
  layout = "stack",
  markSize = 32,
  wordmarkSize,
  intro = false,
  label = "MUDRA",
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

  const resolvedWordmarkSize = wordmarkSize ?? (layout === "row" ? 12.5 : 10);

  return (
    <span
      className={`inline-flex text-fg select-none ${
        layout === "row" ? "flex-row items-center gap-2.5" : "flex-col items-center gap-1.5"
      } ${className}`}
    >
      {playIntro ? (
        <style>{`
          @keyframes mudra-vessel-in {
            from { opacity: 0; transform: scale(0.92); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes mudra-arch-draw {
            from { stroke-dashoffset: 110; opacity: 0.3; }
            to { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes mudra-keystone-pop {
            from { opacity: 0; transform: scale(0.6); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes mudra-wordmark-up {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      ) : null}
      <LogoMark size={markSize} playIntro={playIntro} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: `${resolvedWordmarkSize}px`,
          fontWeight: 700,
          letterSpacing: "0.26em",
          lineHeight: 1,
          textTransform: "uppercase",
          animation: playIntro
            ? "mudra-wordmark-up 340ms cubic-bezier(0.16,1,0.3,1) 680ms both"
            : undefined,
        }}
      >
        {label}
      </span>
    </span>
  );
}
