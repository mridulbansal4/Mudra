import { useState, type MouseEvent } from "react";
import { ArrowUpRight, BatteryFull, Download, Signal, Wifi, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "motion/react";
import { LogoMark } from "../brand/Logo";
import { ANDROID_RELEASE } from "../config/release";
import { ease, useReducedMotion } from "../motion/hooks";
import { NeoButton } from "../ui/NeoButton";

export interface HeroAppPhoneProps {
  scrollProgress: MotionValue<number>;
}

const SPRING_SHEET = {
  type: "spring" as const,
  stiffness: 320,
  damping: 28,
  bounce: 0,
};

export function HeroAppPhone({ scrollProgress }: HeroAppPhoneProps) {
  const reduced = Boolean(useReducedMotion());
  const [open, setOpen] = useState(false);
  const [fadedOut, setFadedOut] = useState(false);
  const [tilt, setTilt] = useState({ rx: 6, ry: -12 });

  const scrollY = useTransform(scrollProgress, [0, 0.55], [0, -44]);
  const scrollOpacity = useTransform(scrollProgress, [0, 0.55], [1, 0]);

  useMotionValueEvent(scrollProgress, "change", (v) => {
    const shouldDisable = v > 0.5;
    if (shouldDisable !== fadedOut) {
      setFadedOut(shouldDisable);
    }
  });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Math.max(1, Math.min(11, 6 - ny * 10)),
      ry: Math.max(-17, Math.min(-7, -12 + nx * 10)),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 6, ry: -12 });
  };

  const stateTransition = reduced ? { duration: 0 } : SPRING_SHEET;

  return (
    <motion.aside
      aria-label="mudra android app launcher"
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.9, delay: 0.36, ease: ease.expoOut }}
      style={reduced ? undefined : { y: scrollY, opacity: scrollOpacity }}
      className={`relative z-20 mt-10 lg:mt-0 lg:absolute lg:right-6 xl:right-10 lg:bottom-8 select-none ${
        fadedOut ? "lg:pointer-events-none" : ""
      }`}
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -4, 0] }}
        transition={
          reduced
            ? undefined
            : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
        }
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: "1200px" }}
      >
        {/* Native Compact 3D Titanium Phone Rim */}
        <div
          style={{
            transform: reduced
              ? "none"
              : `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: reduced
              ? undefined
              : "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
            transformStyle: "preserve-3d",
            borderRadius: "34px",
            padding: "1px",
            background:
              "linear-gradient(160deg, #5a5a5a 0%, #1a1a1a 30%, #3a3a3a 60%, #111111 100%)",
            boxShadow:
              "0 0 0 1.5px #2a2a2a, 0 0 0 3px #111111, 0 32px 64px -16px rgba(0,0,0,0.92), inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
          className="w-[236px] xl:w-[276px]"
        >
          <div
            style={{
              borderRadius: "33px",
              backgroundColor: "#0a0a0a",
              padding: "7px",
            }}
          >
            {/* OLED Inner Screen */}
            <div
              className="relative flex min-h-[296px] flex-col justify-between overflow-hidden text-fg"
              style={{
                borderRadius: "28px",
                backgroundColor: "#0d0d0d",
                backgroundImage:
                  "radial-gradient(80% 60% at 50% 0%, rgba(229,254,64,0.09), transparent 65%), radial-gradient(75% 60% at 85% 100%, rgba(106,53,255,0.15), transparent 65%)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
              }}
            >
              {/* Diagonal Specular Glass Sheen */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  background:
                    "linear-gradient(125deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 28%, transparent 50%)",
                }}
              />

              {/* Status Bar + Dynamic Island */}
              <div className="relative z-20 flex h-[34px] shrink-0 items-center justify-between px-4 pt-1">
                <span className="num text-[11.5px] font-semibold text-fg leading-none">
                  9:41
                </span>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-[6px] h-[18px] w-[68px] -translate-x-1/2 rounded-full bg-pop-void"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
                />
                <span
                  className="flex items-center gap-1 text-fg-2"
                  aria-hidden="true"
                >
                  <Signal size={12} strokeWidth={1.5} />
                  <Wifi size={12} strokeWidth={1.5} />
                  <BatteryFull size={12} strokeWidth={1.5} />
                </span>
              </div>

              {/* Screen Content Area */}
              <div className="relative z-10 flex flex-1 flex-col justify-center px-3.5 py-2.5">
                <AnimatePresence mode="wait" initial={false}>
                  {!open ? (
                    <motion.div
                      key="launcher-home"
                      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                      transition={stateTransition}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[#151515] px-2.5 py-1">
                        <span
                          aria-hidden="true"
                          className="size-[5px] bg-neo-paccha"
                        />
                        <span className="eyebrow !text-[9.5px] !tracking-[0.16em] text-fg-2">
                          ANDROID{" "}
                          <span className="num normal-case">
                            {ANDROID_RELEASE.version}
                          </span>
                        </span>
                      </div>

                      {/* Tactile 3D App Icon Pedestal */}
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-expanded={open}
                        aria-label="open mudra android app download"
                        className="group relative mt-4 flex flex-col items-center border-0 bg-transparent p-0 text-fg cursor-pointer focus-visible:outline-2 focus-visible:outline-neo-paccha focus-visible:outline-offset-4"
                      >
                        <motion.div
                          whileHover={reduced ? undefined : { y: -2 }}
                          whileTap={reduced ? undefined : { x: 3, y: 3 }}
                          className="relative flex size-[80px] items-center justify-center"
                          style={{
                            borderRadius: "20px",
                            backgroundColor: "#141417",
                            border: "1.5px solid #e5fe40",
                            boxShadow: "4px 4px 0 0 #7a8916",
                          }}
                        >
                          <LogoMark size={50} />
                          <span className="num absolute -bottom-2.5 bg-neo-paccha px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-pop-black">
                            tap icon
                          </span>
                        </motion.div>

                        <span className="mt-4 text-[14px] font-bold lowercase tracking-[0.01em] text-fg">
                          mudra
                        </span>
                        <span className="mt-0.5 text-[12px] font-medium lowercase text-fg-2 group-hover:text-neo-paccha transition-colors">
                          download android app
                        </span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="launcher-sheet"
                      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
                      transition={stateTransition}
                      className="flex flex-col gap-2.5 rounded-[20px] border border-[var(--hairline)] bg-[#141414] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <LogoMark size={30} />
                          <div className="text-left">
                            <div className="text-[13.5px] font-bold lowercase leading-tight text-fg">
                              mudra android
                            </div>
                            <div className="num text-[11.5px] font-semibold text-neo-paccha">
                              <span className="normal-case">
                                {ANDROID_RELEASE.version}
                              </span>{" "}
                              · {ANDROID_RELEASE.arm64Size}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          aria-label="close app details"
                          className="flex size-[26px] items-center justify-center rounded-full border border-[var(--hairline)] bg-[#1f1f1f] text-muted hover:text-fg cursor-pointer"
                        >
                          <X size={13} strokeWidth={1.75} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {["escrow", "live check", "90s freeze"].map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#222222] px-2 py-0.5 text-[10.5px] font-semibold lowercase text-fg-2"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* 8px right/bottom clearance so 5px NeoPOP shadow never clips */}
                      <div className="pt-0.5 pr-2 pb-2">
                        <NeoButton
                          variant="paccha"
                          size="md"
                          fullWidth
                          href={ANDROID_RELEASE.arm64ApkUrl}
                          download
                          icon={Download}
                          className="!h-[42px] !px-3 !text-[13px]"
                        >
                          download the app
                        </NeoButton>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--hairline)] pt-2 text-[11px]">
                        <a
                          href={ANDROID_RELEASE.universalApkUrl}
                          download
                          className="num font-medium lowercase text-muted hover:text-fg no-underline transition-colors"
                        >
                          universal ({ANDROID_RELEASE.universalSize.toLowerCase()})
                        </a>
                        <a
                          href={ANDROID_RELEASE.tagUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 font-semibold lowercase text-fg-2 hover:text-neo-paccha no-underline transition-colors"
                        >
                          <span>release notes</span>
                          <ArrowUpRight size={12} strokeWidth={1.75} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Home Indicator */}
              <div className="flex justify-center pb-2 pt-1" aria-hidden="true">
                <div
                  className="h-[4px] w-[84px] rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.45)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
