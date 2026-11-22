import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Menu } from "lucide-react";
import { Logo } from "../brand/Logo";
import { ANDROID_RELEASE } from "../config/release";
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
        className="fixed top-0 left-0 right-0 z-40 flex flex-col w-full transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(13, 13, 13, 0.9)" : "rgba(13, 13, 13, 0.72)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <div className="mx-auto flex h-[62px] md:h-[72px] w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 md:px-10">
          <Link to="/" className="no-underline shrink-0 flex items-center" aria-label="mudra home">
            <Logo markSize={28} wordmarkSize={9} intro={introLogo} />
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href="https://console.nexconn.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[36px] md:h-[40px] items-center gap-1.5 px-1 text-[11px] sm:text-[12px] font-medium lowercase text-fg-2 hover:text-neo-paccha transition-colors no-underline whitespace-nowrap shrink-0"
            >
              <span
                aria-hidden="true"
                className="inline-block size-[5px] shrink-0 rounded-full bg-neo-paccha"
              />
              <span className="hidden sm:inline">powered by </span>
              <span>nexconn.ai ↗</span>
            </a>

            <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
              <NavLink to="/how-it-works" className="nav-link text-[14px] font-semibold lowercase">
                <span>how it works</span>
              </NavLink>
              <NavLink to="/demo" className="nav-link text-[14px] font-semibold lowercase">
                <span>demo</span>
              </NavLink>
              <NavLink to="/traction" className="nav-link text-[14px] font-semibold lowercase">
                <span>traction</span>
              </NavLink>
            </nav>

            <div
              className="hidden lg:inline-flex h-[40px] items-center px-3.5 select-none shrink-0"
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
                className="hidden md:inline text-[13px] font-medium lowercase text-fg-2 hover:text-fg no-underline shrink-0"
              >
                {session.displayName}
              </Link>
            ) : null}

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={ANDROID_RELEASE.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                title="GitHub repository"
                className="flex size-[36px] md:size-[40px] items-center justify-center bg-transparent text-fg hover:text-neo-paccha transition-colors cursor-pointer press no-underline"
                style={{ borderRadius: 0, border: "1px solid #3d3d3d" }}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>

              <button
                ref={menuBtnRef}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="flex size-[36px] md:size-[40px] items-center justify-center bg-transparent text-fg cursor-pointer press"
                style={{ borderRadius: 0, border: "1px solid #3d3d3d" }}
              >
                <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile quick-navigation bar */}
        <nav
          aria-label="Mobile quick links"
          className="flex md:hidden items-center justify-between gap-2 px-4 py-2 text-[11.5px] font-semibold lowercase"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <NavLink to="/demo" className="text-fg-2 hover:text-neo-paccha no-underline whitespace-nowrap">
            demo
          </NavLink>
          <span aria-hidden="true" className="text-dim">·</span>
          <NavLink to="/how-it-works" className="text-fg-2 hover:text-neo-paccha no-underline whitespace-nowrap">
            how it works
          </NavLink>
          <span aria-hidden="true" className="text-dim">·</span>
          <NavLink to="/sandbox" className="text-fg-2 hover:text-neo-paccha no-underline whitespace-nowrap">
            sandbox
          </NavLink>
          <span aria-hidden="true" className="text-dim">·</span>
          <NavLink to="/traction" className="text-fg-2 hover:text-neo-paccha no-underline whitespace-nowrap">
            traction
          </NavLink>
          <span aria-hidden="true" className="text-dim">·</span>
          <a href="#nexconn-architecture" className="text-neo-paccha no-underline whitespace-nowrap">
            nexconn sdk
          </a>
        </nav>
      </header>

      <MenuOverlay open={menuOpen} onClose={handleCloseMenu} />
    </>
  );
}
