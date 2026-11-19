import { BatteryFull, Signal, Wifi } from "lucide-react";
import type { ReactNode } from "react";

export interface PhoneTilt {
  x: number;
  y: number;
  z: number;
}

export interface PhoneFrameProps {
  scale?: number;
  tilt?: PhoneTilt;
  label?: ReactNode;
  roleImgLabel?: string;
  staticDisplay?: boolean;
  children: ReactNode;
  className?: string;
}

const OUTER_W = 414;
const OUTER_H = 868;
const SCREEN_W = 390;
const SCREEN_H = 844;

export function PhoneFrame({
  scale = 1,
  tilt,
  label,
  roleImgLabel,
  staticDisplay = false,
  children,
  className = "",
}: PhoneFrameProps) {
  const scaledW = Math.round(OUTER_W * scale);
  const scaledH = Math.round(OUTER_H * scale);

  const transformParts = [`scale(${scale})`];
  if (tilt && (tilt.x !== 0 || tilt.y !== 0 || tilt.z !== 0)) {
    transformParts.push(
      `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateZ(${tilt.z}deg)`
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      role={roleImgLabel ? "img" : undefined}
      aria-label={roleImgLabel}
    >
      {label ? (
        <div className="mb-4 text-[12.5px] font-semibold lowercase tracking-[0.04em] text-fg-2">
          {label}
        </div>
      ) : null}
      <div
        className="relative shrink-0"
        style={{
          width: `${scaledW}px`,
          height: `${scaledH}px`,
        }}
      >
        {/* Outer titanium rim + bezel */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            marginLeft: `${-OUTER_W / 2}px`,
            width: `${OUTER_W}px`,
            height: `${OUTER_H}px`,
            transform: transformParts.join(" "),
            transformOrigin: "top center",
            borderRadius: "64px",
            padding: "1px",
            background: "linear-gradient(160deg,#5a5a5a,#1a1a1a 30%,#3a3a3a 60%,#111)",
            boxShadow:
              "0 0 0 1.5px #2a2a2a, 0 0 0 3px #111, 0 40px 80px -20px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="relative flex size-full items-center justify-center"
            style={{
              borderRadius: "63px",
              backgroundColor: "#0a0a0a",
              padding: "11px",
            }}
          >
            {/* Logical 390x844 inner screen */}
            <div
              className="relative flex flex-col overflow-hidden bg-pop-black text-fg"
              style={{
                width: `${SCREEN_W}px`,
                height: `${SCREEN_H}px`,
                borderRadius: "52px",
                backgroundColor: "#0d0d0d",
              }}
            >
              {/* Status bar (height 50px) + Dynamic Island */}
              <div className="relative z-20 flex h-[50px] shrink-0 items-center justify-between px-7 select-none">
                <span className="num text-[15px] font-semibold text-fg leading-none">9:41</span>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: "11px",
                    width: "120px",
                    height: "34px",
                    borderRadius: "999px",
                    backgroundColor: "#000000",
                  }}
                />
                <span className="flex items-center gap-1.5 text-fg" aria-hidden="true">
                  <Signal size={16} strokeWidth={1.5} />
                  <Wifi size={16} strokeWidth={1.5} />
                  <BatteryFull size={16} strokeWidth={1.5} />
                </span>
              </div>

              {/* Scrollable screen content area */}
              <div
                className={`no-scrollbar relative flex-1 overflow-y-auto overscroll-contain ${
                  staticDisplay ? "pointer-events-none select-none" : ""
                }`}
              >
                {children}
              </div>

              {/* Home indicator */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[8px] left-1/2 z-20 -translate-x-1/2"
                style={{
                  width: "134px",
                  height: "5px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(255, 255, 255, 0.55)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
