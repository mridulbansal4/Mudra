import { ArrowUpRight, Handshake, ScanQrCode, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "../brand/Logo";

export interface AppShellProps {
  personaName: string;
  personaInitials: string;
  showLivePill?: boolean;
  hideBottomBar?: boolean;
  onHomeTap?: () => void;
  onDealsTap?: () => void;
  onScanTap?: () => void;
  children: ReactNode;
}

export function AvatarRing({
  initials,
  size = 68,
  showBadge = false,
}: {
  initials: string;
  size?: number;
  showBadge?: boolean;
}) {
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full p-[2px] select-none shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: "conic-gradient(#e5fe40, #6a35ff, #ff8744, #e5fe40)",
      }}
    >
      <div
        className="flex size-full items-center justify-center rounded-full font-bold text-fg"
        style={{
          backgroundColor: "#2b2b2b",
          fontSize: `${Math.round(size * 0.28)}px`,
        }}
      >
        {initials}
      </div>
      {showBadge ? (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 flex size-[18px] items-center justify-center rounded-full bg-fg text-pop-black"
          style={{ border: "1.5px solid #0d0d0d" }}
        >
          <ArrowUpRight size={12} strokeWidth={2} />
        </span>
      ) : null}
    </div>
  );
}

export function AppShell({
  personaName,
  personaInitials,
  showLivePill = true,
  hideBottomBar = false,
  onHomeTap,
  onDealsTap,
  onScanTap,
  children,
}: AppShellProps) {
  return (
    <div className="relative flex min-h-full flex-col bg-pop-black text-fg">
      {/* Top app bar (height 56px) */}
      <div className="flex h-[56px] shrink-0 items-center justify-between px-5">
        <button
          type="button"
          onClick={onHomeTap}
          aria-label="App home"
          className="bg-transparent border-0 p-0 text-fg cursor-pointer press"
        >
          <LogoMark size={22} />
        </button>

        {showLivePill ? (
          <button
            type="button"
            onClick={onDealsTap}
            className="inline-flex h-[34px] items-center gap-2 px-3 cursor-pointer press"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--hairline)",
              borderRadius: "999px",
            }}
          >
            <span className="flex items-center -space-x-1.5" aria-hidden="true">
              {["RN", "VS", "MK"].map((init) => (
                <span
                  key={init}
                  className="inline-flex size-[22px] items-center justify-center rounded-full text-[9px] font-bold text-fg"
                  style={{
                    backgroundColor: "#2b2b2b",
                    border: "1px solid #0d0d0d",
                  }}
                >
                  {init}
                </span>
              ))}
            </span>
            <span className="num text-[12px] font-semibold lowercase text-fg">2 live deals</span>
          </button>
        ) : null}

        <div className="relative inline-flex items-center justify-center text-fg-2">
          <Settings2 size={22} strokeWidth={1.5} aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 size-[6px] rounded-full bg-orange-sunshine"
          />
        </div>
      </div>

      {/* Grab-handle line (36x4, #3d3d3d, radius 2) */}
      <div className="flex justify-center pt-1 pb-2" aria-hidden="true">
        <div
          style={{
            width: "36px",
            height: "4px",
            borderRadius: "2px",
            backgroundColor: "#3d3d3d",
          }}
        />
      </div>

      {/* Main sheet content */}
      <div className={`flex-1 px-4 ${hideBottomBar ? "pb-6" : "pb-[104px]"}`}>{children}</div>

      {/* Bottom bar (height 96px incl. safe area) */}
      {!hideBottomBar ? (
        <div
          className="sticky bottom-0 left-0 right-0 z-10 flex h-[96px] shrink-0 items-start justify-around px-4 pt-2"
          style={{
            background: "linear-gradient(180deg, rgba(13,13,13,0), #0d0d0d 30%)",
          }}
        >
          <button
            type="button"
            onClick={onScanTap}
            className="flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer press"
          >
            <span
              className="flex size-[56px] items-center justify-center rounded-full text-fg"
              style={{ border: "1.5px solid #3d3d3d", backgroundColor: "rgba(18,18,18,0.85)" }}
            >
              <ScanQrCode size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-2">
              SCAN TO PAY
            </span>
          </button>

          <button
            type="button"
            onClick={onHomeTap}
            className="flex -mt-2 flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer press"
          >
            <AvatarRing initials={personaInitials} size={68} showBadge />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-2">
              {personaName.toUpperCase()}
            </span>
          </button>

          <button
            type="button"
            onClick={onDealsTap}
            className="flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer press"
          >
            <span
              className="flex size-[56px] items-center justify-center rounded-full text-fg"
              style={{ border: "1.5px solid #3d3d3d", backgroundColor: "rgba(18,18,18,0.85)" }}
            >
              <Handshake size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-2">
              DEALS
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
