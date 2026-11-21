import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Menu } from "lucide-react";
import { Logo } from "../brand/Logo";
import { useSession } from "../lib/session";
import { MenuOverlay } from "./MenuOverlay";

export interface SiteNavProps {
  introLogo?: boolean;
}

export function SiteNav({ introLogo = false }: SiteNavProps) {
  const session = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY >= 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCloseMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => {
      menuBtnRef.current?.focus();
    });
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 flex h-[60px] md:h-[72px] w-full items-center justify-between px-5 md:px-10 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(13, 13, 13, 0.72)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid var(--hairline)" : "1px solid transparent",
        }}
      >
        <Link to="/" className="no-underline" aria-label="samadhan home">
          <Logo markSize={32} wordmarkSize={10} intro={introLogo} />
        </Link>

        <div className="flex items-center gap-6">
          <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
            <NavLink
              to="/how-it-works"
              className={({ isActive }) =>
                `relative text-[14px] font-semibold lowercase no-underline transition-colors ${
                  isActive ? "text-fg" : "text-fg-2 hover:text-fg"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>how it works</span>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[6px] h-[2px] bg-neo-paccha"
                    />
                  ) : null}
                </>
              )}
            </NavLink>
            <NavLink
              to="/demo"
              className={({ isActive }) =>
                `relative text-[14px] font-semibold lowercase no-underline transition-colors ${
                  isActive ? "text-fg" : "text-fg-2 hover:text-fg"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>demo</span>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[6px] h-[2px] bg-neo-paccha"
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          </nav>

          <div
            className="hidden lg:inline-flex h-[40px] items-center px-3.5 select-none"
            style={{ border: "1px solid #3d3d3d", borderRadius: 0 }}
          >
            <span
              className="eyebrow text-fg-2"
              style={{ fontSize: "9px", letterSpacing: "0.22em" }}
            >
              LIVE ESCROW · 4 LANGUAGES
            </span>
          </div>

          {session ? (
            <Link
              to="/app"
              className="hidden md:inline text-[13px] font-medium lowercase text-fg-2 hover:text-fg no-underline"
            >
              {session.displayName}
            </Link>
          ) : null}

          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex size-[40px] items-center justify-center bg-transparent text-fg cursor-pointer press"
            style={{ borderRadius: 0, border: "1px solid #3d3d3d" }}
          >
            <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </header>

      <MenuOverlay open={menuOpen} onClose={handleCloseMenu} />
    </>
  );
}
