import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "../brand/Logo";
import { setSession, useSession } from "../lib/session";
import { ease, useReducedMotion } from "../motion/hooks";
import { Eyebrow } from "../ui/Eyebrow";
import { NeoButton } from "../ui/NeoButton";

export interface MenuOverlayProps {
  open: boolean;
  onClose: () => void;
}

const MENU_LINKS = [
  { to: "/", label: "home" },
  { to: "/how-it-works", label: "how it works" },
  { to: "/demo", label: "two-phone demo" },
  { to: "/sandbox", label: "live sandbox" },
  { to: "/arena", label: "bargain arena" },
  { to: "/dispatch", label: "dispatch desk" },
  { to: "/guide", label: "sdk guide" },
  { to: "/traction", label: "traction" },
] as const;

export function MenuOverlay({ open, onClose }: MenuOverlayProps) {
  const session = useSession();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      initial={
        reducedMotion
          ? { opacity: 1 }
          : { clipPath: "circle(0% at calc(100% - 60px) 36px)" }
      }
      animate={
        reducedMotion
          ? { opacity: 1 }
          : { clipPath: "circle(150% at calc(100% - 60px) 36px)" }
      }
      transition={{ duration: 0.6, ease: ease.inOut }}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-pop-black text-fg"
    >
      {/* 50% mesh canvas backdrop */}
      <div aria-hidden="true" className="mesh-canvas pointer-events-none absolute inset-0 opacity-50" />

      {/* Top header */}
      <div className="relative z-10 flex h-[60px] md:h-[72px] w-full items-center justify-between px-5 md:px-10">
        <Link to="/" onClick={onClose} className="no-underline" aria-label="samadhan home">
          <Logo markSize={24} wordmarkSize={9} />
        </Link>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex size-[40px] items-center justify-center bg-transparent text-fg cursor-pointer press"
          style={{ borderRadius: 0, border: "1px solid #3d3d3d" }}
        >
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* Main columns */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-12 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-10">
        <nav aria-label="All pages" className="flex flex-col gap-3 md:w-[60%]">
          {MENU_LINKS.map((item, idx) => (
            <motion.div
              key={item.to}
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: reducedMotion ? 0 : idx * 0.06,
                ease: ease.expoOut,
              }}
            >
              <Link
                to={item.to}
                onClick={onClose}
                className="group inline-flex items-center gap-3 t-h1 lowercase text-fg no-underline transition-transform duration-200 hover:translate-x-[12px]"
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-[10px] shrink-0 bg-neo-paccha opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ borderRadius: 0 }}
                />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </nav>

        <div className="flex flex-col items-start gap-5 md:w-[34%]">
          <Eyebrow dot>YOUR SEAT</Eyebrow>
          {session ? (
            <div className="flex flex-col items-start gap-4">
              <div className="text-[18px] font-bold lowercase text-fg">{session.displayName}</div>
              <NeoButton variant="paccha" size="md" to="/app" onClick={onClose}>
                open my desk
              </NeoButton>
              <button
                type="button"
                onClick={() => {
                  setSession(null);
                  onClose();
                  navigate("/");
                }}
                className="bg-transparent border-0 p-0 text-[13px] font-semibold lowercase text-muted hover:text-fg cursor-pointer press"
              >
                sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <NeoButton variant="paccha" size="md" to="/auth" onClick={onClose}>
                sign in
              </NeoButton>
              <NeoButton variant="ghost" size="md" to="/onboarding" onClick={onClose}>
                start onboarding
              </NeoButton>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 pb-6 md:px-10">
        <p className="t-small lowercase text-muted">
          built on nexconn · team chanakya · nexconn build challenge 2026
        </p>
      </div>
    </motion.div>
  );
}
